// Central analytics SDK wrapper (spec §22: "create a central analytics
// SDK/service wrapper rather than scattered ad-hoc logging calls").
//
// Every `analytics.track()` call in the portal (health-hub-africa/lib/api.ts)
// delegates here. This module owns everything the raw POST /analytics/events
// call used to skip: idempotency (eventId), session lifecycle, duplicate-click
// debouncing, and a bounded retry queue — without requiring any change at the
// ~40 existing call sites, since it accepts the same legacy snake_case keys
// (element_id, feature_area, path, ...) those sites already pass and maps
// them onto the richer TrackEventDto fields added in the event-schema branch.

const VISITOR_ID_KEY = 'hha-anonymous-visitor-id'
const SESSION_ID_KEY = 'hha-analytics-session-id'
const SESSION_ACTIVITY_KEY = 'hha-analytics-session-last-activity'

// Spec §7 inactivity_timeout: a session that's been idle this long is over —
// the next event starts a new one rather than extending the old row forever.
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000

const DEBOUNCE_WINDOW_MS = 300
const MAX_QUEUE_SIZE = 50
const MAX_SEND_ATTEMPTS = 3
const RETRY_BACKOFF_MS = [1000, 4000, 9000]

const ANALYTICS_ENDPOINT = () =>
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1/analytics/events'

// Legacy/ergonomic aliases the existing ~40 call sites already use, mapped
// onto the first-class TrackEventDto columns (spec §8.1 / §20) so those
// fields land in dedicated columns instead of the properties JSON blob
// without touching any call site.
const FIELD_ALIASES: Record<string, keyof TrackFields> = {
  element_id: 'elementId',
  element_type: 'elementType',
  feature_area: 'featureArea',
  page_name: 'pageName',
  page_path: 'pagePath',
  path: 'pagePath',
  entity_type: 'entityType',
  entity_id: 'entityId',
}

const KNOWN_FIELDS = new Set<string>([
  'elementId', 'elementType', 'featureArea', 'pageName', 'pagePath',
  'action', 'outcome', 'entityType', 'entityId',
])

interface TrackFields {
  elementId?: string
  elementType?: string
  featureArea?: string
  pageName?: string
  pagePath?: string
  action?: string
  outcome?: string
  entityType?: string
  entityId?: string
}

interface TrackEventPayload {
  eventType: string
  eventId: string
  eventVersion: number
  occurredAt: string
  ingestionSource: 'web'
  anonymousVisitorId?: string
  analyticsSessionId?: string
  elementId?: string
  elementType?: string
  featureArea?: string
  pageName?: string
  pagePath?: string
  action?: string
  outcome?: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

// crypto.randomUUID() is available in every evergreen browser; the fallback
// below still produces a well-formed v4 string (server validates eventId
// with @IsUUID()) rather than the non-UUID shape api.ts's generic
// generateIdempotencyKey() falls back to — a malformed eventId would fail
// DTO validation and drop the whole event, not just the dedup key.
function randomEventId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined
  if (c?.randomUUID) return c.randomUUID()
  const bytes = c?.getRandomValues
    ? c.getRandomValues(new Uint8Array(16))
    : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function readStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    // Private browsing / storage-full — analytics degrades to session-less
    // rather than throwing into a caller that never awaits us anyway.
  }
}

// Persists across visits (localStorage) so a pre-login visitor can be
// correlated across repeat sessions before they ever register.
function getAnonymousVisitorId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  let id = readStorage(localStorage, VISITOR_ID_KEY)
  if (!id) {
    id = randomEventId()
    writeStorage(localStorage, VISITOR_ID_KEY, id)
  }
  return id
}

// sessionStorage, with its own idle-timeout rotation on top of the tab-close
// reset sessionStorage already gives us for free. Deliberately separate from
// the auth session (spec Appendix B: never reuse a raw auth session
// identifier for analytics correlation).
function getAnalyticsSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const now = Date.now()
  const lastActivity = Number(readStorage(sessionStorage, SESSION_ACTIVITY_KEY) ?? 0)
  let id = readStorage(sessionStorage, SESSION_ID_KEY)
  if (!id || (lastActivity && now - lastActivity > SESSION_IDLE_TIMEOUT_MS)) {
    id = randomEventId()
    writeStorage(sessionStorage, SESSION_ID_KEY, id)
  }
  writeStorage(sessionStorage, SESSION_ACTIVITY_KEY, String(now))
  return id
}

// ── Duplicate-click debounce (spec §22: "debounce duplicate click events") ──

const lastFiredAt = new Map<string, number>()

function isDuplicateClick(eventType: string, elementId: string | undefined): boolean {
  if (!elementId) return false
  const key = `${eventType}:${elementId}`
  const now = Date.now()
  const last = lastFiredAt.get(key)
  lastFiredAt.set(key, now)
  return last !== undefined && now - last < DEBOUNCE_WINDOW_MS
}

// ── Bounded send queue with backoff retry ───────────────────────────────────
//
// Analytics failure must never surface to the caller (spec §22: "queue
// events asynchronously so analytics failure does not block patient
// workflows"). A transient network blip gets a few retries; anything else —
// including running out of retries — is dropped silently. The queue is
// capped so a sustained outage can't grow unbounded memory; oldest pending
// sends are dropped first since a stale analytics event is worse than a
// missing one.

interface QueuedSend {
  payload: TrackEventPayload
  attempt: number
}

const sendQueue: QueuedSend[] = []
let flushScheduled = false

function enqueue(payload: TrackEventPayload): void {
  if (sendQueue.length >= MAX_QUEUE_SIZE) sendQueue.shift()
  sendQueue.push({ payload, attempt: 0 })
  scheduleFlush(0)
}

function scheduleFlush(delayMs: number): void {
  if (flushScheduled) return
  flushScheduled = true
  setTimeout(() => {
    flushScheduled = false
    void flushQueue()
  }, delayMs)
}

async function flushQueue(): Promise<void> {
  const pending = sendQueue.splice(0, sendQueue.length)
  let needsRetry = false

  for (const item of pending) {
    const ok = await sendOnce(item.payload)
    if (!ok && item.attempt + 1 < MAX_SEND_ATTEMPTS) {
      sendQueue.push({ payload: item.payload, attempt: item.attempt + 1 })
      needsRetry = true
    }
  }

  if (needsRetry) {
    // Index by how many attempts the soonest-due item has already made
    // (attempt was already incremented above, so subtract 1) — the first
    // retry waits RETRY_BACKOFF_MS[0], not the last item's backoff.
    const dueRetryNumber = Math.min(...sendQueue.map((q) => q.attempt - 1))
    scheduleFlush(RETRY_BACKOFF_MS[dueRetryNumber] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1])
  }
}

// keepalive lets the browser finish the request after the page starts
// unloading (navigation, tab close) — important for exit-page/last-click
// events, which is exactly when a plain fetch would otherwise be aborted.
async function sendOnce(payload: TrackEventPayload): Promise<boolean> {
  try {
    const res = await fetch(ANALYTICS_ENDPOINT(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
    // A 4xx means the server rejected this payload permanently (validation,
    // malformed event name) — retrying identical bytes will never succeed.
    // Only a missing response (network) or 5xx is worth a retry.
    return res.ok || (res.status >= 400 && res.status < 500)
  } catch {
    return false
  }
}

// ── Public API ───────────────────────────────────────────────────────────

let previousPagePath: string | undefined

function normalizeFields(fields?: Record<string, unknown>): { known: TrackFields; metadata: Record<string, unknown> | undefined } {
  const known: TrackFields = {}
  const metadata: Record<string, unknown> = {}
  for (const [rawKey, value] of Object.entries(fields ?? {})) {
    const key = FIELD_ALIASES[rawKey] ?? rawKey
    if (KNOWN_FIELDS.has(key)) {
      ;(known as Record<string, unknown>)[key] = value
    } else {
      metadata[rawKey] = value
    }
  }
  return { known, metadata: Object.keys(metadata).length > 0 ? metadata : undefined }
}

export function track(eventType: string, fields?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return

  const { known, metadata } = normalizeFields(fields)
  if (isDuplicateClick(eventType, known.elementId)) return

  enqueue({
    eventType,
    eventId: randomEventId(),
    eventVersion: 1,
    occurredAt: new Date().toISOString(),
    ingestionSource: 'web',
    anonymousVisitorId: getAnonymousVisitorId(),
    analyticsSessionId: getAnalyticsSessionId(),
    ...known,
    metadata,
  })
}

// One governed page_view per route change (spec §22), carrying the previous
// path forward so the event schema's implicit "previous_page" story
// (Appendix A) can be reconstructed from consecutive page_view rows.
export function pageView(pagePath: string): void {
  track('page_view', { pagePath, previousPagePath })
  previousPagePath = pagePath
}

// CTA impressions (spec §8.3 CTR = clicks / impressions) — distinct from
// clicks, fired at most once per element per page view via the caller-owned
// `seen` set (see TrackImpression, which scopes one set per mount).
export function impression(elementId: string, fields?: Record<string, unknown>): void {
  track('cta_impression', { element_id: elementId, action: 'impression', ...fields })
}

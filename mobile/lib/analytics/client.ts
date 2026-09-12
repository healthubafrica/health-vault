// Central analytics SDK wrapper for the mobile app — the React Native
// counterpart of health-hub-africa/lib/analytics/client.ts (spec §22).
// Same algorithms (debounce window, backoff schedule, alias mapping, v4
// eventId formatting) as the web client so the two clients behave
// identically from the server's point of view; only the storage primitives
// differ (SecureStore instead of localStorage, in-memory instead of
// sessionStorage — see getAnalyticsSessionId below for why).
//
// Every analytics.track() call in mobile/lib/api.ts delegates here with no
// change required at existing call sites.

import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../api';

const VISITOR_ID_KEY = 'hha_mobile_anon_visitor_id';

const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const DEBOUNCE_WINDOW_MS = 300;
const MAX_QUEUE_SIZE = 50;
const MAX_SEND_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [1000, 4000, 9000];

const FIELD_ALIASES: Record<string, keyof TrackFields> = {
  element_id: 'elementId',
  element_type: 'elementType',
  feature_area: 'featureArea',
  page_name: 'pageName',
  page_path: 'pagePath',
  path: 'pagePath',
  entity_type: 'entityType',
  entity_id: 'entityId',
};

const KNOWN_FIELDS = new Set<string>([
  'elementId', 'elementType', 'featureArea', 'pageName', 'pagePath',
  'action', 'outcome', 'entityType', 'entityId',
]);

interface TrackFields {
  elementId?: string;
  elementType?: string;
  featureArea?: string;
  pageName?: string;
  pagePath?: string;
  action?: string;
  outcome?: string;
  entityType?: string;
  entityId?: string;
}

interface TrackEventPayload {
  eventType: string;
  eventId: string;
  eventVersion: number;
  occurredAt: string;
  ingestionSource: 'mobile';
  anonymousVisitorId?: string;
  analyticsSessionId?: string;
  elementId?: string;
  elementType?: string;
  featureArea?: string;
  pageName?: string;
  pagePath?: string;
  action?: string;
  outcome?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

// Hermes' crypto.randomUUID() availability varies by SDK/polyfill setup, so
// this always produces a well-formed v4 string itself rather than trusting
// a fallback shape — the server's @IsUUID() validator drops the whole event
// on a malformed eventId, not just the dedup key.
export function randomEventId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = c?.getRandomValues
    ? c.getRandomValues(new Uint8Array(16))
    : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Persists across app installs' sessions via SecureStore (already the
// pattern this file used before — no encryption need, just reusing what's
// available) so a pre-login visitor can be correlated across repeat opens.
let cachedVisitorId: string | null = null;

async function getAnonymousVisitorId(): Promise<string | undefined> {
  if (cachedVisitorId) return cachedVisitorId;
  try {
    let id = await SecureStore.getItemAsync(VISITOR_ID_KEY);
    if (!id) {
      id = randomEventId();
      await SecureStore.setItemAsync(VISITOR_ID_KEY, id);
    }
    cachedVisitorId = id;
    return id;
  } catch {
    return undefined;
  }
}

// In-memory only, unlike the web client's sessionStorage — React Native's JS
// context is the closest mobile analogue to "one browser tab": it lives for
// as long as the app process does and is gone on a full app kill, which is
// the right session boundary here (same idea as a closed tab losing
// sessionStorage). Idle-timeout rotation (spec §7) still applies within a
// single app run.
let sessionId: string | undefined;
let lastActivityAt = 0;

function getAnalyticsSessionId(): string {
  const now = Date.now();
  if (!sessionId || (lastActivityAt && now - lastActivityAt > SESSION_IDLE_TIMEOUT_MS)) {
    sessionId = randomEventId();
  }
  lastActivityAt = now;
  return sessionId;
}

// ── Duplicate-tap debounce ───────────────────────────────────────────────

const lastFiredAt = new Map<string, number>();

function isDuplicateTap(eventType: string, elementId: string | undefined): boolean {
  if (!elementId) return false;
  const key = `${eventType}:${elementId}`;
  const now = Date.now();
  const last = lastFiredAt.get(key);
  lastFiredAt.set(key, now);
  return last !== undefined && now - last < DEBOUNCE_WINDOW_MS;
}

// ── Bounded send queue with backoff retry ───────────────────────────────────
//
// Spec §22: "support offline/retry behavior for mobile only with bounded
// queues and duplicate protection." No connectivity library is added for
// this — a failed fetch (which is exactly what happens with no network)
// already drives the same bounded/backoff retry the web client uses; a
// dedicated NetInfo listener would only save the wasted first attempt while
// offline, not change the outcome.

interface QueuedSend {
  payload: TrackEventPayload;
  attempt: number;
}

const sendQueue: QueuedSend[] = [];
let flushScheduled = false;

function enqueue(payload: TrackEventPayload): void {
  if (sendQueue.length >= MAX_QUEUE_SIZE) sendQueue.shift();
  sendQueue.push({ payload, attempt: 0 });
  scheduleFlush(0);
}

function scheduleFlush(delayMs: number): void {
  if (flushScheduled) return;
  flushScheduled = true;
  setTimeout(() => {
    flushScheduled = false;
    void flushQueue();
  }, delayMs);
}

async function flushQueue(): Promise<void> {
  const pending = sendQueue.splice(0, sendQueue.length);
  let needsRetry = false;

  for (const item of pending) {
    const ok = await sendOnce(item.payload);
    if (!ok && item.attempt + 1 < MAX_SEND_ATTEMPTS) {
      sendQueue.push({ payload: item.payload, attempt: item.attempt + 1 });
      needsRetry = true;
    }
  }

  if (needsRetry) {
    const dueRetryNumber = Math.min(...sendQueue.map((q) => q.attempt - 1));
    scheduleFlush(RETRY_BACKOFF_MS[dueRetryNumber] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]);
  }
}

async function sendOnce(payload: TrackEventPayload): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // A 4xx means the server rejected this payload permanently — retrying
    // identical bytes will never succeed. Only a missing response (offline,
    // DNS, timeout) or 5xx is worth a retry.
    return res.ok || (res.status >= 400 && res.status < 500);
  } catch {
    return false;
  }
}

// ── Public API ───────────────────────────────────────────────────────────

let previousPagePath: string | undefined;

function normalizeFields(fields?: Record<string, unknown>): { known: TrackFields; metadata: Record<string, unknown> | undefined } {
  const known: TrackFields = {};
  const metadata: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(fields ?? {})) {
    const key = FIELD_ALIASES[rawKey] ?? rawKey;
    if (KNOWN_FIELDS.has(key)) {
      (known as Record<string, unknown>)[key] = value;
    } else {
      metadata[rawKey] = value;
    }
  }
  return { known, metadata: Object.keys(metadata).length > 0 ? metadata : undefined };
}

export function track(eventType: string, fields?: Record<string, unknown>): void {
  const { known, metadata } = normalizeFields(fields);
  if (isDuplicateTap(eventType, known.elementId)) return;

  void getAnonymousVisitorId().then((anonymousVisitorId) => {
    enqueue({
      eventType,
      eventId: randomEventId(),
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      ingestionSource: 'mobile',
      anonymousVisitorId,
      analyticsSessionId: getAnalyticsSessionId(),
      ...known,
      metadata,
    });
  });
}

// One governed page_view per screen focus — not yet wired to a navigation
// listener anywhere (expo-router screens don't call this today); exported
// so screens/a future root-level focus listener can adopt it without
// another schema change, matching the web client's pageView() shape.
export function pageView(pagePath: string): void {
  track('page_view', { pagePath, previousPagePath });
  previousPagePath = pagePath;
}

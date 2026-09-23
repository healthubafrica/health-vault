# Identity & Sessionization Design

Spec §32 deliverable: "Identity and Sessionization Design." Covers spec §6 (Anonymous Visitor, Patient and Session Identity) and §7 (Session Analytics) as actually implemented. Grounded directly in `AnalyticsService.trackEvent`/`rollUpSession`, the web and mobile analytics SDKs, and the `PatientActivityEvent`/`AnalyticsSession`/`UserSession` schemas — update it when any of those change, it will drift otherwise.

## 1. The three identifiers on every event

`PatientActivityEvent` carries up to three distinct identity/session columns, and they are deliberately never conflated:

| Column | What it is | Lifetime | Set by |
|---|---|---|---|
| `patientId` | The real `Patient` row, once one exists | Permanent | Server, resolved from the JWT's `sub` claim via `Patient.findUnique({ userId })` — **never trusted from the client**, even when a client sends an `anonymousVisitorId` |
| `anonymousVisitorId` | Pseudonymous pre-login visitor id | Persists across app/browser sessions (see §2) | Client-generated, sent by the client; only stored when `patientId` is absent (`trackEvent` explicitly drops it once a patient is resolved — see §3) |
| `analyticsSessionId` | Pseudonymous "one visit" id | One idle-timeout window (see §2) | Client-generated, sent by the client |
| `sessionId` (FK → `UserSession`) | The real auth session (refresh-token-bearing) | One login | **Not** analytics-owned — spec Appendix B explicitly warns against reusing a raw auth session identifier for analytics correlation, so this is a separate column from `analyticsSessionId` and analytics code never reads or writes it |

## 2. Anonymous visitor id and analytics session id (client-side)

Both web and mobile implement the same two-identifier scheme with the same algorithm, differing only in storage primitive:

| | Web (`health-hub-africa/lib/analytics/client.ts`) | Mobile (`mobile/lib/analytics/client.ts`) |
|---|---|---|
| **Anonymous visitor id** | `localStorage` key `hha-anonymous-visitor-id` | `expo-secure-store` key `hha_mobile_anon_visitor_id` |
| Lifetime | Until the browser's storage is cleared — survives tab closes and new sessions | Until the app is uninstalled — survives app kills |
| Generated with | `randomEventId()` — always produces a well-formed v4 UUID itself (doesn't trust `crypto.randomUUID` availability) | Same algorithm, same function name, ported 1:1 |
| **Analytics session id** | `sessionStorage` key `hha-analytics-session-id`, activity timestamp in `hha-analytics-session-last-activity` | In-memory module variable (`sessionId`/`lastActivityAt`) |
| Lifetime | Until 30 minutes of inactivity (`SESSION_IDLE_TIMEOUT_MS`), **or** the tab closes (`sessionStorage` is tab-scoped, so a closed tab loses it for free) | Until 30 minutes of inactivity, **or** the app process is killed (RN's JS context is the closest mobile analogue to "one browser tab") |
| Rotation check | On every `track()` call: if no id exists, or `now - lastActivity > 30min`, generate a new one | Same logic, same 30-minute constant |

**Why sessionStorage/in-memory instead of a longer-lived store for the session id specifically:** a "session" is meant to represent one continuous visit, not the whole relationship with the visitor — that's what the anonymous visitor id is for. Using a persistent store for both would conflate "this visitor has been here before" (retention/returning-visitor questions) with "this is the same continuous visit" (bounce/engagement questions).

## 3. Patient identity resolution and the anonymous→patient handoff

- **Every authenticated `trackEvent` call resolves `patientId` from the JWT**, not from anything the client claims. A client can send `anonymousVisitorId` on every call (harmless — the server just ignores it), but once `patientId` resolves, `anonymousVisitorId` is explicitly *not* stored on that row (`anonymousVisitorId: patientId ? undefined : dto.anonymousVisitorId`).
- **Pre-login events genuinely have no `patientId` to resolve** — there's no `Patient` row yet. This matters for two events named explicitly in spec §23: `registration_complete` and `otp_verify_success` fire from `AuthService`/`authStore.ts` at a point where only a `User` row exists, not a `Patient`. The web and mobile SDKs both export `getAnonymousVisitorId()` specifically so `register()`/`verifyOtp()` in `lib/api.ts` can attach it to the request — otherwise those two events would have no identity to attribute to at all.
- **There is no explicit "merge" step** that reassigns a pre-login anonymous visitor's historical events to the newly-created patient row. Once a patient logs in, *new* events carry `patientId` instead of `anonymousVisitorId`; the visitor's pre-registration anonymous events stay keyed to `anonymousVisitorId` permanently. Funnel/retention math that needs to count "did this visitor register" relies on unique-user keys (`patientId` or `anon:<anonymousVisitorId>`) being distinct populations at that seam — see `docs/ANALYTICS-KPI-DICTIONARY.md`'s Registration Conversion entry for the one KPI this actually blocks today (not buildable, for an unrelated reason — no `registration_start` emitter exists).

## 4. Mid-visit identity stitching (the one real "merge" that does happen)

`rollUpSession` is where a *session* — not the event history — does get stitched to a patient mid-visit:

```
// AnalyticsService.rollUpSession, on an existing session row:
...(p.patientId ? { patientId: p.patientId } : {}),
```

If a visitor starts a session anonymously (browsing pre-login) and then logs in or registers **within the same idle-timeout window**, the *same* `AnalyticsSession` row gets its `patientId` set on the next event, without losing the `entryPage`/`pageViewCount`/`clickCount` accumulated before login. This is intentional and is the only place in the pipeline where an anonymous and authenticated identity for the same real person are linked — it happens because the `analyticsSessionId` (not the identity) is the stitching key, and that id doesn't change across login.

## 5. Session rollup (`AnalyticsSession`, spec §7)

Every event with an `analyticsSessionId` triggers a best-effort upsert into `AnalyticsSession` (failures here never block the event write itself):

- **First event for a session id** creates the row: `entryPage`/`exitPage` both set to the current `pagePath`, `startedAt`/`lastEventAt` to now, counters initialized from this one event, `returningVisitor` computed **once, at creation**, by checking whether any prior `AnalyticsSession` row exists for this `patientId` (or `anonymousVisitorId` if still anonymous).
- **Every subsequent event** updates `lastEventAt`, `exitPage` (last-write-wins), increments `pageViewCount`/`clickCount`/`eventCount` as applicable, and stitches `patientId` if now available (§4).
- **`engaged` becomes `true`** the moment either condition is met, and never resets: (a) the event name is in `MEANINGFUL_SESSION_EVENTS` (`booking_confirmed`, `payment_success`, `upload_success`, `manual_entry_success`, `ticket_created`, `share_success`, `registration_complete`, `otp_verify_success`, `dispatch_request_success`, `telecare_session_join_success`, `travelsafe_trip_created`, `profile_completed`, `first_meaningful_action`), or (b) `eventCount >= 2` (spec §7's "engaged_session" — a genuine second interaction, not a single-page bounce). This `engaged` flag is what `docs/ANALYTICS-KPI-DICTIONARY.md`'s Clicks per Session KPI filters on.
- **No session-close/timeout sweep exists.** `endedAt` is a real column (`@map("ended_at")`) but nothing ever sets it — a session simply stops receiving updates once the visitor goes idle or leaves. `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` §2 already flags the retention-side implication (no purge job); this doc flags the functional side: there is no scheduled job that would let a dashboard distinguish "still an open/live session" from "abandoned 40 minutes ago" other than comparing `lastEventAt` to now client-side.

## 6. Server-authoritative events and identity

`emitServerEvent` (spec §23) is the one path that doesn't go through a client SDK at all — it's called directly from `AuthService`, `AppointmentsService`, `PaymentsService`, etc. Identity resolution there:
- Callers pass either `patientId` directly (when they already have it) or `userId` (resolved to `patientId` the same way `trackEvent` does).
- `anonymousVisitorId`/`analyticsSessionId` are optional pass-throughs from the caller — most server-side callers (payment webhooks, in particular) simply don't have a client session id available, so `rollUpSession` no-ops for those rows (a `PatientActivityEvent` still gets written; it just isn't attached to any session).
- `emitServerEvent` is deliberately **not consent-gated** — its events (`login_success`/`login_failure`) double as account-protection records, and spec §28 requires that a product-analytics opt-out never disables security logging. See `docs/ANALYTICS-PRIVACY-GOVERNANCE.md` §5 for the full consent-gate design (client `trackEvent` path only).

## 7. What this design deliberately does not do

- **No cross-device identity resolution.** The same real person on web and mobile gets two unrelated `anonymousVisitorId`s and two unrelated `analyticsSessionId` schemes (localStorage vs SecureStore, sessionStorage vs in-memory) until they log in on both — at which point `patientId` is the only thing that unifies them. There is no probabilistic or deterministic device-graph matching.
- **No session merge across a logout/login cycle.** A visitor who logs out and back in within the same idle window gets a *new* `analyticsSessionId` only if the client SDK's storage was cleared on logout; if it wasn't, the same session id continues and simply gets re-stitched to `patientId` again on the next event, same as §4. This codebase does not explicitly clear `SESSION_ID_KEY`/`SESSION_ACTIVITY_KEY` on logout, so in practice the same analytics session usually survives a logout/login within the idle window.
- **No server-side session ID generation or validation.** The server trusts whatever `analyticsSessionId` a client sends as an opaque grouping key; nothing about its format is checked beyond it being a non-empty string. This is intentional — spec Appendix B's warning against reusing the auth session identifier already establishes that this id carries no authorization weight, only correlation value.

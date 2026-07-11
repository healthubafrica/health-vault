# Idle-Timeout Logout Warning — Design

**Date:** 2026-07-10
**Status:** Approved

## Context

The patient portal (`health-hub-africa`) has no idle-timeout mechanism today — a session stays active indefinitely as long as the JWT/cookie remains valid, with no client-side nudge to log out an inactive, unattended session. This adds a centralized warning: after a period of inactivity, a modal tells the patient they're about to be logged out, giving them a chance to stay signed in.

## Scope

**In scope:**
- Patient portal (`health-hub-africa`) only. Not the admin portal.
- A single, centralized idle-timeout mechanism wired into the authenticated app shell (`AppShell.tsx`), so it applies uniformly across every protected route without per-page wiring.
- 10 minutes of inactivity → warning modal. 60 more seconds with no response → auto-logout.
- Activity signals that reset the timer: mouse movement, clicks, keyboard input, scroll, touch.
- The idle timer is suspended entirely while the patient is in an active TeleCare video call, so a patient who is watching/listening without touching the mouse is never logged out mid-consultation.
- "Continue session" dismisses the modal and resets the local idle timer only — no extra network call. The existing `useAuthRefresh` hook (refresh-on-focus/visibility) already covers session validity independently of this feature.

**Out of scope:**
- The admin portal (`health-hub-africa-admin`) — no idle-timeout added there in this pass.
- Any change to JWT/token expiry, refresh-token logic, or `useAuthRefresh`.
- A "remember me" or configurable-per-user timeout — the 10 min / 60s values are fixed constants for now.

## Architecture

**`lib/stores/callStore.ts`** (new, small Zustand store): exposes `isInCall: boolean` and `setInCall(value: boolean)`. `components/screens/TeleCareScreen.tsx` calls `setInCall(true)` when a LiveKit session becomes active (alongside its existing `setActiveToken`/`setActiveRoom` calls) and `setInCall(false)` when the call ends or is left. This is the only piece of new global state — everything else in the idle-timeout mechanism is local to the hook.

**`lib/hooks/useIdleLogout.ts`** (new hook): tracks a `lastActivityAt` timestamp in a ref, updated by a single set of `mousemove`/`click`/`keydown`/`scroll`/`touchstart` listeners attached once on mount (passive, throttled to avoid excessive re-renders — the ref update itself doesn't need to trigger a re-render). A `setInterval` (checked every few seconds, not on every event) compares `now - lastActivityAt` against the two thresholds and drives a small state machine exposed to the caller:

```ts
type IdleState = 'active' | 'warning' | 'loggedOut'
```

- `active → warning` when idle ≥ 10 minutes (600_000 ms) — but only if `callStore.isInCall` is false. While `isInCall` is true, the interval check is skipped entirely (no warning, no logout), and `lastActivityAt` is kept fresh so the countdown doesn't resume mid-way through a finished call.
- `warning → loggedOut` when idle ≥ 10 minutes + 60 seconds (660_000 ms) from the same `lastActivityAt` baseline — calls `authStore.logout()` (same function `Sidebar.tsx`/`Topbar.tsx` already call), then hard-redirects to `/` via `window.location.assign('/')`, with a `toast.error("You were logged out due to inactivity.")` fired just before the redirect.
- Any qualifying activity event while in `warning` state, OR clicking "Continue session" in the modal, resets `lastActivityAt` and returns to `active`.

The hook returns `{ idleState, remainingSeconds, continueSession }` for the modal component to consume — `remainingSeconds` counts down from 60 during the `warning` state, recomputed each interval tick from the same `lastActivityAt` baseline (not a separate timer), so there's a single source of truth for "how much time is left."

**`components/layout/IdleWarningModal.tsx`** (new): rendered unconditionally inside `AppShell.tsx`, returns `null` unless `idleState === 'warning'`. Follows the existing fixed-overlay-plus-centered-card convention used by `CancelAppointmentModal.tsx` (dark overlay, centered white card, no new modal primitive). Content:

- Heading/body: "You've been inactive for a while. You'll be logged out automatically unless you continue your session."
- A live countdown: "Logging out in {remainingSeconds}s" — makes the promise in the message visibly true rather than an abstract threat.
- One primary button: "Continue session" → calls `continueSession()` from the hook.
- No secondary "log out now" button — out of scope; a patient who wants to log out immediately can already do so via the existing `Sidebar`/`Topbar` logout control.

**Wiring**: `AppShell.tsx` calls `useIdleLogout()` once (alongside its existing `useAuthRefresh()` call) and renders `<IdleWarningModal idleState={...} remainingSeconds={...} onContinue={...} />` alongside its other always-mounted children (`MobilePanelSheet`, etc.). Because `AppShell` is only rendered by `app/(protected)/layout.tsx`, the idle-timeout mechanism naturally never runs on public/marketing pages or the login page.

## Data Flow

```
DOM activity event
  → useIdleLogout updates lastActivityAt ref (no re-render)

setInterval tick (every few seconds)
  → useIdleLogout reads callStore.isInCall
      → if true: skip, refresh lastActivityAt, stay 'active'
      → if false: compute idle duration
          → < 10min: stay 'active'
          → 10min–11min: 'warning', remainingSeconds ticks down
          → ≥ 11min: 'loggedOut' → authStore.logout() → toast → hard redirect to '/'

User clicks "Continue session" (only visible during 'warning')
  → continueSession() resets lastActivityAt → back to 'active'
```

## Error Handling

- `authStore.logout()` already handles its own API-call failure by clearing local tokens regardless (see `logout()` in `authStore.ts`, existing `try { await auth.logout() } catch { clearTokens() }` pattern) — the idle-logout path reuses this unchanged, so a failed logout API call still results in a local, effective logout.
- If the idle-timeout interval fires while the user is mid-navigation or an API call is in flight, no special handling is needed — the hard redirect via `window.location.assign('/')` is safe to fire at any point; in-flight requests are simply abandoned as the page unloads, same as any other navigation.

## Testing

- Unit test `useIdleLogout` with fake timers (`jest.useFakeTimers()`): verify the `active → warning → loggedOut` transitions fire at the correct offsets, verify `isInCall = true` fully suspends the interval's state transitions, verify `continueSession()` resets state back to `active` from `warning`.
- Manual browser verification: sit idle for 10 minutes (or temporarily lower the constants for a manual test pass), confirm the modal appears with a live countdown, confirm "Continue session" dismisses it and resets the clock, confirm auto-logout redirects to `/` with the toast after the full 11-minute window, confirm no warning appears while an active TeleCare call is in progress.

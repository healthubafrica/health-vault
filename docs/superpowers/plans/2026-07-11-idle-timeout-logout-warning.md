# Idle-Timeout Logout Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warn a patient after 10 minutes of inactivity that they'll be auto-logged-out in 60 seconds, then actually log them out if they don't respond — centralized in the patient portal's authenticated app shell.

**Architecture:** A small Zustand store (`callStore`) exposes whether a TeleCare video call is active. A new hook (`useIdleLogout`) tracks activity via DOM listeners plus a polling interval, drives an `active → warning → loggedOut` state machine (suspended while `callStore.isInCall` is true), and is consumed by a new modal component wired once into `AppShell.tsx`.

**Tech Stack:** Next.js 15 App Router, React, Zustand, `sonner` toasts, Playwright (this app has no unit-test runner — Playwright's `page.clock` API is used to fast-forward the idle timers in e2e tests instead).

## Global Constraints

- Patient portal (`health-hub-africa`) only — do not touch `health-hub-africa-admin`.
- Idle threshold: 10 minutes (600,000 ms). Warning-to-logout grace period: 60 seconds (600,000 + 60,000 = 660,000 ms total from last activity).
- Activity signals that reset the timer: `mousemove`, `click`, `keydown`, `scroll`, `touchstart`.
- Idle detection is fully suspended while `callStore.isInCall` is `true` (active TeleCare video call) — no warning, no logout, and the activity clock doesn't resume mid-call.
- "Continue session" resets the local timer only — no network call.
- Modal message text: "You've been inactive for a while. You'll be logged out automatically unless you continue your session." plus a live "Logging out in {N}s" countdown.
- Reuse the existing fixed-overlay-plus-centered-card modal convention (see `components/appointments/CancelAppointmentModal.tsx`) — no new modal primitive.
- Verification bar: `pnpm tsc --noEmit` clean in `health-hub-africa`, plus a Playwright e2e spec using `page.clock` to fast-forward through both thresholds (no real 11-minute wait).

---

### Task 1: Call-state store

**Files:**
- Create: `health-hub-africa/lib/stores/callStore.ts`

**Interfaces:**
- Produces: `useCallStore` — Zustand hook exposing `{ isInCall: boolean, setInCall: (value: boolean) => void }`, consumed by Task 2 (idle hook) and Task 3 (TeleCare wiring).

- [ ] **Step 1: Write the store**

```ts
'use client'

import { create } from 'zustand'

interface CallState {
  isInCall: boolean
  setInCall: (value: boolean) => void
}

export const useCallStore = create<CallState>()((set) => ({
  isInCall: false,
  setInCall: (value) => set({ isInCall: value }),
}))
```

- [ ] **Step 2: Typecheck**

Run: `cd health-hub-africa && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add health-hub-africa/lib/stores/callStore.ts
git commit -m "feat(telecare): add callStore to track active video-call state"
```

---

### Task 2: `useIdleLogout` hook

**Files:**
- Create: `health-hub-africa/lib/hooks/useIdleLogout.ts`

**Interfaces:**
- Consumes: `useCallStore` (Task 1) — reads `isInCall`. `useAuthStore` (`health-hub-africa/lib/stores/authStore.ts`) — calls `logout(): Promise<void>` (existing, `lib/stores/authStore.ts:20`).
- Produces: `useIdleLogout(): { idleState: 'active' | 'warning' | 'loggedOut', remainingSeconds: number, continueSession: () => void }`, consumed by Task 4 (`IdleWarningModal`) and Task 5 (`AppShell` wiring).

- [ ] **Step 1: Write the hook**

```ts
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCallStore } from '@/lib/stores/callStore'

const IDLE_WARNING_MS = 10 * 60 * 1000 // 10 minutes
const GRACE_PERIOD_MS = 60 * 1000 // 60 seconds
const IDLE_LOGOUT_MS = IDLE_WARNING_MS + GRACE_PERIOD_MS
const CHECK_INTERVAL_MS = 1000
const ACTIVITY_EVENTS = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart'] as const

export type IdleState = 'active' | 'warning' | 'loggedOut'

export function useIdleLogout() {
  const logout = useAuthStore((s) => s.logout)
  const isInCall = useCallStore((s) => s.isInCall)

  const lastActivityAt = useRef(Date.now())
  const [idleState, setIdleState] = useState<IdleState>('active')
  const [remainingSeconds, setRemainingSeconds] = useState(60)

  const continueSession = useCallback(() => {
    lastActivityAt.current = Date.now()
    setIdleState('active')
    setRemainingSeconds(60)
  }, [])

  // Activity listeners: update the ref only, no re-render on every event.
  useEffect(() => {
    const onActivity = () => {
      lastActivityAt.current = Date.now()
    }
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true })
    }
    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity)
      }
    }
  }, [])

  // Polling check, drives the state machine.
  useEffect(() => {
    const interval = setInterval(() => {
      if (isInCall) {
        // Suspended during an active TeleCare call: keep the clock fresh so
        // the countdown doesn't resume mid-way through once the call ends.
        lastActivityAt.current = Date.now()
        return
      }

      const idleMs = Date.now() - lastActivityAt.current

      if (idleMs >= IDLE_LOGOUT_MS) {
        setIdleState('loggedOut')
        void logout().finally(() => {
          toast.error('You were logged out due to inactivity.')
          window.location.assign('/')
        })
        return
      }

      if (idleMs >= IDLE_WARNING_MS) {
        setIdleState('warning')
        setRemainingSeconds(Math.max(0, Math.ceil((IDLE_LOGOUT_MS - idleMs) / 1000)))
      } else {
        setIdleState('active')
      }
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isInCall, logout])

  return { idleState, remainingSeconds, continueSession }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd health-hub-africa && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add health-hub-africa/lib/hooks/useIdleLogout.ts
git commit -m "feat(auth): add useIdleLogout hook for idle-timeout warning/logout"
```

---

### Task 3: Wire TeleCare call state into `callStore`

**Files:**
- Modify: `health-hub-africa/components/screens/TeleCareScreen.tsx:1-116`

**Interfaces:**
- Consumes: `useCallStore` (Task 1) — `setInCall(value: boolean)`.

- [ ] **Step 1: Import the store**

In `health-hub-africa/components/screens/TeleCareScreen.tsx`, change the import block at the top (currently lines 1-11):

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { Video, PhoneOff, Clock, Loader2, AlertCircle } from 'lucide-react'
import { telecare, TelecareSession } from '@/lib/api'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { useCallStore } from '@/lib/stores/callStore'
```

- [ ] **Step 2: Read `setInCall` inside the component**

Inside `export function TeleCareScreen() {`, right after the existing state declarations (after the line `const [joining, setJoining] = useState(false)`, currently line 23), add:

```tsx
  const setInCall = useCallStore((s) => s.setInCall)
```

- [ ] **Step 3: Set `isInCall` true when a call is joined**

In `handleJoinSession`, the success branch currently reads (lines 83-90):

```tsx
      if (res && res.token) {
        setActiveToken(res.token)
        setActiveRoom(res.roomName)
        // The API returns the LiveKit server URL alongside the token — use it
        // so the call works even when NEXT_PUBLIC_LIVEKIT_URL isn't set on
        // this deployment. The env var remains as a fallback.
        setActiveServerUrl(res.serverUrl ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? null)
        setActiveSessionId(sessionId)
      } else {
```

Change to:

```tsx
      if (res && res.token) {
        setActiveToken(res.token)
        setActiveRoom(res.roomName)
        // The API returns the LiveKit server URL alongside the token — use it
        // so the call works even when NEXT_PUBLIC_LIVEKIT_URL isn't set on
        // this deployment. The env var remains as a fallback.
        setActiveServerUrl(res.serverUrl ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? null)
        setActiveSessionId(sessionId)
        setInCall(true)
      } else {
```

- [ ] **Step 4: Set `isInCall` false when the call ends**

`handleLeaveSession` currently reads (lines 102-116):

```tsx
  const handleLeaveSession = () => {
    // Fire-and-forget: advance the session to 'completed' on the server so
    // the row doesn't sit at 'active' forever. The LiveKit webhook will do
    // the same thing when the room finishes, but this gives an instant flip
    // for the patient-initiated case. Errors are intentionally swallowed —
    // the sweep cron is the final safety net.
    if (activeSessionId) {
      telecare.markCompleted(activeSessionId).catch(() => null)
    }
    setActiveToken(null)
    setActiveRoom(null)
    setActiveServerUrl(null)
    setActiveSessionId(null)
    fetchSessions()
  }
```

Change to:

```tsx
  const handleLeaveSession = () => {
    // Fire-and-forget: advance the session to 'completed' on the server so
    // the row doesn't sit at 'active' forever. The LiveKit webhook will do
    // the same thing when the room finishes, but this gives an instant flip
    // for the patient-initiated case. Errors are intentionally swallowed —
    // the sweep cron is the final safety net.
    if (activeSessionId) {
      telecare.markCompleted(activeSessionId).catch(() => null)
    }
    setActiveToken(null)
    setActiveRoom(null)
    setActiveServerUrl(null)
    setActiveSessionId(null)
    setInCall(false)
    fetchSessions()
  }
```

- [ ] **Step 5: Typecheck**

Run: `cd health-hub-africa && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add health-hub-africa/components/screens/TeleCareScreen.tsx
git commit -m "feat(telecare): mark callStore active/inactive around LiveKit sessions"
```

---

### Task 4: `IdleWarningModal` component

**Files:**
- Create: `health-hub-africa/components/layout/IdleWarningModal.tsx`

**Interfaces:**
- Consumes: the return shape of `useIdleLogout` (Task 2) — `{ idleState: 'active' | 'warning' | 'loggedOut', remainingSeconds: number, continueSession: () => void }`, passed in as props (this component does not call the hook itself, so `AppShell` — Task 5 — stays the single call site and both the modal and any future consumer share one hook instance).

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { Button } from '@/components/ui/Button'
import type { IdleState } from '@/lib/hooks/useIdleLogout'

interface IdleWarningModalProps {
  idleState: IdleState
  remainingSeconds: number
  onContinue: () => void
}

export function IdleWarningModal({ idleState, remainingSeconds, onContinue }: IdleWarningModalProps) {
  if (idleState !== 'warning') return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Still there?
          </h2>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            You've been inactive for a while. You'll be logged out automatically unless you continue your session.
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Logging out in {remainingSeconds}s
          </p>
        </div>
        <div
          className="flex justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="primary" size="sm" onClick={onContinue}>
            Continue session
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd health-hub-africa && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add health-hub-africa/components/layout/IdleWarningModal.tsx
git commit -m "feat(auth): add IdleWarningModal component"
```

---

### Task 5: Wire into `AppShell`

**Files:**
- Modify: `health-hub-africa/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `useIdleLogout` (Task 2), `IdleWarningModal` (Task 4).

- [ ] **Step 1: Update imports and wire the hook + modal**

`AppShell.tsx` currently reads:

```tsx
'use client'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { RightPanel } from './RightPanel'
import { MobileBottomNav } from './MobileBottomNav'
import { MobilePanelSheet } from './MobilePanelSheet'
import { PageTransition } from './PageTransition'
import { useAuthRefresh } from '@/lib/hooks/useAuthRefresh'

export function AppShell({ children }: { children: React.ReactNode }) {
  useAuthRefresh()

  return (
    <div
      className="flex h-screen w-screen overflow-hidden p-0 md:p-[16px_20px] gap-0 md:gap-3"
      style={{ background: 'var(--color-outer-bg)' }}
    >
      {/* Sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden md:rounded-[20px] bg-[var(--color-bg)]">
        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 md:p-5 focus:outline-none"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Right panel — hidden below lg */}
      <RightPanel />

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Mobile panel sheet */}
      <MobilePanelSheet />
    </div>
  )
}
```

Replace entirely with:

```tsx
'use client'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { RightPanel } from './RightPanel'
import { MobileBottomNav } from './MobileBottomNav'
import { MobilePanelSheet } from './MobilePanelSheet'
import { PageTransition } from './PageTransition'
import { IdleWarningModal } from './IdleWarningModal'
import { useAuthRefresh } from '@/lib/hooks/useAuthRefresh'
import { useIdleLogout } from '@/lib/hooks/useIdleLogout'

export function AppShell({ children }: { children: React.ReactNode }) {
  useAuthRefresh()
  const { idleState, remainingSeconds, continueSession } = useIdleLogout()

  return (
    <div
      className="flex h-screen w-screen overflow-hidden p-0 md:p-[16px_20px] gap-0 md:gap-3"
      style={{ background: 'var(--color-outer-bg)' }}
    >
      {/* Sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden md:rounded-[20px] bg-[var(--color-bg)]">
        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 md:p-5 focus:outline-none"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Right panel — hidden below lg */}
      <RightPanel />

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Mobile panel sheet */}
      <MobilePanelSheet />

      {/* Idle-timeout warning */}
      <IdleWarningModal
        idleState={idleState}
        remainingSeconds={remainingSeconds}
        onContinue={continueSession}
      />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd health-hub-africa && npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add health-hub-africa/components/layout/AppShell.tsx
git commit -m "feat(auth): wire idle-timeout warning into AppShell"
```

---

### Task 6: E2E test with mocked clock

**Files:**
- Create: `health-hub-africa/tests/e2e/idle-timeout.spec.ts`

**Interfaces:**
- Consumes: nothing new — exercises the wired feature end-to-end through the browser, following the existing auth-cookie-mocking convention from `health-hub-africa/tests/e2e/subscriptions-screen.spec.ts:53-65`.

- [ ] **Step 1: Write the test**

```ts
import { test, expect, type Page } from '@playwright/test'

/** Set a fake auth cookie so the middleware allows the request through. */
async function setAuthCookie(page: Page) {
  await page.context().addCookies([
    {
      name: 'hha_at',
      value: 'fake-jwt-token-for-e2e-testing',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
    },
  ])
}

async function mockDashboardApis(page: Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { id: 'u1', email: 'patient@example.com', role: 'patient' } }),
    }),
  )
  await page.route('**/api/v1/auth/logout', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  )
}

test.describe('Idle-timeout logout warning', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthCookie(page)
    await mockDashboardApis(page)
    await page.clock.install({ time: new Date() })
    await page.goto('/dashboard')
  })

  test('shows the warning modal after 10 minutes idle', async ({ page }) => {
    await expect(page.getByText('Still there?')).not.toBeVisible()

    await page.clock.fastForward('10:01')

    await expect(page.getByText('Still there?')).toBeVisible()
    await expect(
      page.getByText("You've been inactive for a while. You'll be logged out automatically unless you continue your session."),
    ).toBeVisible()
  })

  test('clicking "Continue session" dismisses the modal', async ({ page }) => {
    await page.clock.fastForward('10:01')
    await expect(page.getByText('Still there?')).toBeVisible()

    await page.getByRole('button', { name: 'Continue session' }).click()

    await expect(page.getByText('Still there?')).not.toBeVisible()
  })

  test('auto-logs-out and redirects to "/" after the full grace period', async ({ page }) => {
    await page.clock.fastForward('10:01')
    await expect(page.getByText('Still there?')).toBeVisible()

    await page.clock.fastForward('00:59')

    await page.waitForURL('**/')
    await expect(page.getByText('You were logged out due to inactivity.')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the test**

Run: `cd health-hub-africa && npx playwright test tests/e2e/idle-timeout.spec.ts`
Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add health-hub-africa/tests/e2e/idle-timeout.spec.ts
git commit -m "test(auth): add e2e coverage for idle-timeout warning/logout"
```

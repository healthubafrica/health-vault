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

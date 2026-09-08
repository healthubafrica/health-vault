'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from '@/lib/api'

const MESSAGE_MAX_LENGTH = 300

// Global, app-wide client-error capture (spec: Digital Experience dashboard).
// Deliberately window-level rather than a React error boundary — this also
// catches errors outside the React tree (event handlers, timers) and
// promise rejections, which boundaries miss entirely. Mounted in the root
// layout so it covers pre-login routes too, not just the authenticated app.
export function ErrorTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      analytics.track('client_error', {
        message: (event.message ?? 'Unknown error').slice(0, MESSAGE_MAX_LENGTH),
        page: pathname,
        source: event.filename,
      })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      analytics.track('client_error', {
        message: message.slice(0, MESSAGE_MAX_LENGTH),
        page: pathname,
        source: 'unhandled_promise_rejection',
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [pathname])

  return null
}

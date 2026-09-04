'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { captureVisitorAttribution } from '@/lib/visitorAttribution'

// Anonymous pageview beacon — fires once per client-side navigation against
// the same-origin /api/analytics/visit BFF route (never directly at the
// backend, so real geo headers can be read server-side). Renders nothing.
export default function VisitorBeacon() {
  const pathname = usePathname()

  useEffect(() => {
    const attribution = captureVisitorAttribution()
    const payload = JSON.stringify({
      path: pathname,
      landingPage: window.location.href,
      ...attribution,
    })

    try {
      const sent =
        typeof navigator.sendBeacon === 'function' &&
        navigator.sendBeacon('/api/analytics/visit', new Blob([payload], { type: 'application/json' }))

      if (!sent) {
        fetch('/api/analytics/visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {
      // Never let a beacon failure affect the page.
    }
  }, [pathname])

  return null
}

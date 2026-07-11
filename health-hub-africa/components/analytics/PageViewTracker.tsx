'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from '@/lib/api'

// Emits one page_view activity event per route change. Fire-and-forget:
// analytics.track swallows every failure, so a dead endpoint can never
// affect navigation.
export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) analytics.track('page_view', { path: pathname })
  }, [pathname])

  return null
}

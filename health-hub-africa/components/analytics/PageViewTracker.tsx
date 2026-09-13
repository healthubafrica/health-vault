'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { pageView } from '@/lib/analytics/client'

// Emits one page_view activity event per route change, via the analytics
// SDK's pageView() so previous_page is carried forward automatically
// (Appendix A). Fire-and-forget: the client's queue swallows every failure,
// so a dead endpoint can never affect navigation.
export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) pageView(pathname)
  }, [pathname])

  return null
}

'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'

// Refetches /auth/me when the tab regains focus so role / status changes
// applied by an admin take effect on the next interaction instead of the
// next manual logout. The api.ts request layer dedups GETs within 3s, so
// multi-tab focus storms collapse to a single network call.
export function useAuthRefresh() {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    const refresh = () => {
      void fetchMe()
    }
    const onVisibility = () => {
      if (!document.hidden) refresh()
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuthenticated, fetchMe])
}

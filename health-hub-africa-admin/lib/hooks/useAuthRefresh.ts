'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'

// Refetches /auth/me when the tab regains focus so role / status changes
// applied by a super_admin take effect on the next interaction instead of
// the next manual logout. The api.ts request layer dedups GETs within 3s,
// so multi-tab focus storms collapse to a single network call.
export function useAuthRefresh() {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Reconcile store state with the real session on mount. proxy.ts already
  // guarantees an hha_at cookie exists for any rendered dashboard route, but
  // isAuthenticated/user can still be stale or unset here — e.g. a login that
  // got interrupted by a page refresh before auth.me() resolved, or a cookie
  // that survived a cleared localStorage. Without this, the dashboard renders
  // "logged in" (data loads via the cookie) while user is still null.
  useEffect(() => {
    void fetchMe()
  }, [fetchMe])

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

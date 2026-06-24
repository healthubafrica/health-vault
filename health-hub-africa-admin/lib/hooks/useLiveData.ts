'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Standalone trigger for pages that already manage their own loading
// state via useEffect/useState (e.g. complex pages where dropping in
// useLiveData would require a structural refactor). Invokes the callback
// on window focus, on tab becoming visible, and on a poll interval while
// visible. Pauses while the tab is hidden.
export function useAutoRefresh(callback: () => void, intervalMs = 20_000) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    const fire = () => {
      if (!document.hidden) cbRef.current()
    }
    const start = () => {
      if (interval || document.hidden) return
      interval = setInterval(fire, intervalMs)
    }
    const stop = () => {
      if (!interval) return
      clearInterval(interval)
      interval = null
    }
    const onFocus = () => fire()
    const onVis = () => {
      if (document.hidden) stop()
      else {
        fire()
        start()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    start()

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
      stop()
    }
  }, [intervalMs])
}

interface UseLiveDataOptions {
  /** Polling interval while the tab is visible. Default 20s. */
  intervalMs?: number
  /** Set false to skip fetching entirely (e.g. while a modal is open). */
  enabled?: boolean
}

interface UseLiveDataResult<T> {
  data: T | null
  /** True until the first response (success or error) lands. Drives skeleton UI. */
  isInitialLoad: boolean
  /** True during *any* fetch — initial or background refresh. */
  isLoading: boolean
  error: string | null
  refresh: () => void
}

const DEFAULT_INTERVAL_MS = 20_000

// Live data for admin operations dashboards. Auto-refreshes when:
//   • the dependency array changes (filters, page, etc.)
//   • the tab regains focus or becomes visible
//   • a poll tick fires while the tab is visible
// Polling pauses while the tab is hidden so we don't churn the API for an
// unwatched dashboard. The api.ts request layer dedups GETs within 3s so
// the focus + poll combo collapses on overlap.
export function useLiveData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseLiveDataOptions = {},
): UseLiveDataResult<T> {
  const { intervalMs = DEFAULT_INTERVAL_MS, enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedOnce = useRef(false)

  // Latest fetcher closure so background refreshes always use current
  // filters/page even though the effect only re-binds when deps change.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      setData(result)
      hasLoadedOnce.current = true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch + when deps change
  useEffect(() => {
    if (!enabled) return
    hasLoadedOnce.current = false
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  // Focus + visibility refetch + interval polling
  useEffect(() => {
    if (!enabled) return

    let intervalId: ReturnType<typeof setInterval> | null = null
    const startPolling = () => {
      if (intervalId || document.hidden) return
      intervalId = setInterval(() => {
        if (!document.hidden) void refresh()
      }, intervalMs)
    }
    const stopPolling = () => {
      if (!intervalId) return
      clearInterval(intervalId)
      intervalId = null
    }
    const onFocus = () => {
      if (!document.hidden) void refresh()
    }
    const onVisibility = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        void refresh()
        startPolling()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    startPolling()

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      stopPolling()
    }
  }, [enabled, intervalMs, refresh])

  return {
    data,
    isLoading,
    isInitialLoad: isLoading && !hasLoadedOnce.current,
    error,
    refresh,
  }
}

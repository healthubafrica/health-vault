'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ApiError } from '@/lib/api'

interface UseApiOptions {
  /**
   * When set, the hook polls at this interval (ms) while the tab is
   * visible, and refetches on focus / visibilitychange. Default: off.
   * Set to a number like 20_000 to turn a one-shot fetch into a live view.
   */
  pollIntervalMs?: number
}

interface UseApiResult<T> {
  data: T | null
  isLoading: boolean
  /** True only while data has never been fetched yet — shows skeleton UI */
  isInitialLoad: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { pollIntervalMs } = options
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedOnce = useRef(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
      hasLoadedOnce.current = true
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        setData(null)
        hasLoadedOnce.current = true
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { load() }, [load])

  // Optional polling + focus/visibility refetch. Polling pauses while the
  // tab is hidden so background tabs don't churn the API. The request
  // layer already dedups GETs within 3s, so a focus event landing close to
  // a poll tick collapses to a single network call.
  useEffect(() => {
    if (!pollIntervalMs) return

    let intervalId: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (intervalId || document.hidden) return
      intervalId = setInterval(() => {
        if (!document.hidden) void load()
      }, pollIntervalMs)
    }
    const stop = () => {
      if (!intervalId) return
      clearInterval(intervalId)
      intervalId = null
    }
    const onFocus = () => { if (!document.hidden) void load() }
    const onVisibility = () => {
      if (document.hidden) stop()
      else { void load(); start() }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    start()

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [pollIntervalMs, load])

  return {
    data,
    isLoading,
    isInitialLoad: isLoading && !hasLoadedOnce.current,
    error,
    refetch: load,
  }
}

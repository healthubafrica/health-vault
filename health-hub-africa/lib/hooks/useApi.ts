'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ApiError } from '@/lib/api'

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
): UseApiResult<T> {
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

  return {
    data,
    isLoading,
    isInitialLoad: isLoading && !hasLoadedOnce.current,
    error,
    refetch: load,
  }
}

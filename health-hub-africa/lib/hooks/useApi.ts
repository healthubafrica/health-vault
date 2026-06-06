'use client'

import { useState, useEffect, useCallback } from 'react'
import { ApiError } from '@/lib/api'

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        setData(null)
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { load() }, [load])

  return { data, isLoading, error, refetch: load }
}

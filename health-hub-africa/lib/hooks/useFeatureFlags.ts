'use client'

import { useEffect, useState } from 'react'
import { features } from '@/lib/api'

// Module-level cache so the flags endpoint is only called once per page lifetime,
// not once per component mount.
let cache: { flags: Record<string, boolean>; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>(cache?.flags ?? {})
  const [loaded, setLoaded] = useState(cache !== null && cache.expiresAt > Date.now())

  useEffect(() => {
    if (cache && cache.expiresAt > Date.now()) {
      setFlags(cache.flags)
      setLoaded(true)
      return
    }

    features.getFlags().then((data) => {
      cache = { flags: data, expiresAt: Date.now() + CACHE_TTL_MS }
      setFlags(data)
      setLoaded(true)
    }).catch(() => {
      // On failure, default to showing all features (fail open).
      setLoaded(true)
    })
  }, [])

  // isEnabled returns true while flags are still loading (fail open),
  // and after loading returns the actual flag value (default true if missing).
  const isEnabled = (key: string) => !loaded || (flags[key] !== false)

  return { flags, loaded, isEnabled }
}

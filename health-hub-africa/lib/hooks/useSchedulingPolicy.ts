'use client'

import { useEffect, useState } from 'react'
import { appointments } from '@/lib/api'

export interface SchedulingPolicy {
  cancellationWindowHours: number
  rescheduleWindowHours: number
  selfServiceEnabled: boolean
}

const DEFAULT_POLICY: SchedulingPolicy = {
  cancellationWindowHours: 24,
  rescheduleWindowHours: 24,
  selfServiceEnabled: true,
}

// Module-level cache so the policy endpoint is only called once per page
// lifetime, not once per component mount — mirrors useFeatureFlags.ts.
let cache: { policy: SchedulingPolicy; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

export function useSchedulingPolicy() {
  const [policy, setPolicy] = useState<SchedulingPolicy>(cache?.policy ?? DEFAULT_POLICY)
  const [loaded, setLoaded] = useState(cache !== null && cache.expiresAt > Date.now())

  useEffect(() => {
    if (cache && cache.expiresAt > Date.now()) {
      setPolicy(cache.policy)
      setLoaded(true)
      return
    }

    appointments.getSchedulingPolicy().then((data) => {
      cache = { policy: data, expiresAt: Date.now() + CACHE_TTL_MS }
      setPolicy(data)
      setLoaded(true)
    }).catch(() => {
      // Fail open with sane defaults so the UI doesn't block on a network error.
      setLoaded(true)
    })
  }, [])

  return { policy, loaded }
}

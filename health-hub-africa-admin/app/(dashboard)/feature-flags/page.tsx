'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type FeatureFlag } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/Button'

export default function FeatureFlagsPage() {
  const { user } = useAuthStore()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.featureFlags.list()
      setFlags(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggle = useCallback(async (key: string, current: boolean) => {
    setToggling(key)
    setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !current } : f))
    try {
      const res = await adminApi.featureFlags.set(key, !current)
      setFlags(res.data)
    } catch (err) {
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: current } : f))
      setError(err instanceof Error ? err.message : 'Failed to update flag')
    } finally {
      setToggling(null)
    }
  }, [])

  if (user && user.role !== 'super_admin') {
    return (
      <div className="max-w-[1200px]">
        <Card>
          <p className="text-center py-8 text-sm font-medium" style={{ color: 'var(--color-emergency)' }}>
            Access denied — Super Admin only
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Feature Flags
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Super Admin only — {flags.length} flags
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Warning banner */}
      <div
        className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{
          background: 'var(--color-warning-bg, #2a200a)',
          borderColor: 'var(--color-warning, #F5A623)',
          color: 'var(--color-warning, #F5A623)',
        }}
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm font-medium">
          Changes take effect immediately for new requests.
        </p>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <SkeletonBox height={16} className="rounded" style={{ width: 160 }} />
                  <SkeletonBox height={12} className="rounded" style={{ width: 280 }} />
                </div>
                <SkeletonBox height={20} className="rounded-full" style={{ width: 40 }} />
              </div>
            </Card>
          ))
        ) : flags.length === 0 ? (
          <Card>
            <p className="text-center text-sm py-4" style={{ color: 'var(--color-text-muted)' }}>
              No feature flags configured
            </p>
          </Card>
        ) : (
          flags.map((flag) => (
            <Card key={flag.key}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      {flag.label}
                    </p>
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
                    >
                      {flag.key}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {flag.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: flag.enabled ? '#6DC43F' : 'var(--color-text-muted)' }}
                  >
                    {flag.enabled ? 'ON' : 'OFF'}
                  </span>

                  {toggling === flag.key ? (
                    <span className="w-5 h-5 border-2 border-[#6DC43F] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  ) : (
                    <button
                      onClick={() => handleToggle(flag.key, flag.enabled)}
                      className="relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0"
                      style={{ background: flag.enabled ? '#6DC43F' : 'var(--color-border)' }}
                      aria-label={flag.enabled ? `Disable ${flag.label}` : `Enable ${flag.label}`}
                      aria-checked={flag.enabled}
                      role="switch"
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: flag.enabled ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

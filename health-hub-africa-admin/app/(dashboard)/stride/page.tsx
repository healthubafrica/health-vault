'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '@/lib/api'
import { useAutoRefresh } from '@/lib/hooks/useLiveData'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, Ambulance, Users, Activity } from 'lucide-react'

interface StrideOverview {
  activeCases: number
  pendingCases: number
  resolvedToday: number
  assignedProviders: number
}

interface HpacsOverview {
  totalProviders: number
  verifiedProviders: number
  availableForEmergency: number
}

interface EfceCase {
  id: string
  status: string
  createdAt: string
  patient?: { firstName: string; lastName: string; hhaPatientId: string }
}

const EFCE_STATUS_PILL: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = {
  on_scene: 'warning',
  patient_stabilised: 'info',
  transported: 'success',
}

function MetricCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{value}</p>
      {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{hint}</p>}
    </Card>
  )
}

export default function StridePage() {
  const [overview, setOverview] = useState<StrideOverview | null>(null)
  const [hpacs, setHpacs] = useState<HpacsOverview | null>(null)
  const [efce, setEfce] = useState<EfceCase[]>([])
  const [funnel, setFunnel] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ov, hp, ef, fu] = await Promise.all([
        adminApi.stride.overview(),
        adminApi.stride.hpacs(),
        adminApi.stride.efce(),
        adminApi.stride.expertReviewFunnel(),
      ])
      setOverview(ov)
      setHpacs(hp)
      setEfce(ef)
      setFunnel(fu)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load STRIDE data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useAutoRefresh(load, 30_000)

  const funnelTotal = Object.values(funnel).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            STRIDE™ Intelligence
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Emergency triage, provider coordination and expert-review flow
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-4">
          <p className="text-sm" style={{ color: 'var(--color-emergency)' }}>{error}</p>
        </Card>
      )}

      {loading && !overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><SkeletonBox height={56} className="rounded" /></Card>
          ))}
        </div>
      ) : overview && (
        <>
          <div className="flex items-center gap-1.5 mb-2">
            <Ambulance className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              STRIDE™ — Dispatch Triage
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <MetricCard label="Active Cases" value={overview.activeCases} />
            <MetricCard label="Pending Requests" value={overview.pendingCases} />
            <MetricCard label="Resolved Today" value={overview.resolvedToday} />
            <MetricCard label="Units Assigned" value={overview.assignedProviders} />
          </div>
        </>
      )}

      {hpacs && (
        <>
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              HPACS™ — Provider Coordination
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <MetricCard label="Total Providers" value={hpacs.totalProviders} />
            <MetricCard label="Verified" value={hpacs.verifiedProviders} />
            <MetricCard label="Emergency-Available" value={hpacs.availableForEmergency} />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EFCE active field cases */}
        <Card padding={false}>
          <div className="flex items-center gap-1.5 px-4 pt-4 pb-2">
            <Activity className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              EFCE™ — Active Field Cases
            </p>
          </div>
          {efce.length === 0 ? (
            <p className="px-4 pb-6 pt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>No active field cases</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {efce.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : 'Unknown patient'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {c.patient?.hhaPatientId ?? c.id} · since {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <Pill variant={EFCE_STATUS_PILL[c.status] ?? 'neutral'}>{c.status.replace(/_/g, ' ')}</Pill>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Expert review funnel */}
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Expert Review Funnel
          </p>
          {funnelTotal === 0 && Object.keys(funnel).length === 0 ? (
            <SkeletonBox height={120} className="rounded" />
          ) : (
            <div className="space-y-2">
              {Object.entries(funnel).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--color-text)' }}>{status.replace(/_/g, ' ')}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: funnelTotal > 0 ? `${(count / funnelTotal) * 100}%` : '0%',
                        background: '#6DC43F',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

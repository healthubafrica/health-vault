'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type ClinicalQueueItem } from '@/lib/api'
import { useAutoRefresh } from '@/lib/hooks/useLiveData'
import { Card, CardTitle } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { RefreshCw, Video, FileSearch, Clock, Activity } from 'lucide-react'

function queueStatusVariant(status: string): 'success' | 'warning' | 'emergency' | 'neutral' {
  if (status === 'active' || status === 'in_progress') return 'success'
  if (status === 'waiting') return 'warning'
  if (status === 'urgent') return 'emergency'
  return 'neutral'
}

interface QueueCardProps {
  item: ClinicalQueueItem
}

function QueueCard({ item }: QueueCardProps) {
  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-3"
      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
            {item.patientName}
          </p>
          {item.providerName && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
              {item.providerName}
            </p>
          )}
        </div>
        <Pill variant={queueStatusVariant(item.status)}>{item.status}</Pill>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {item.waitMinutes} min wait
        </span>
      </div>
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: number
  icon: React.ReactNode
}

function KpiCard({ label, value, icon }: KpiCardProps) {
  return (
    <Card className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: '#6DC43F22' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      </div>
    </Card>
  )
}

export default function ClinicalQueuePage() {
  const [teleconsults, setTeleconsults] = useState<ClinicalQueueItem[]>([])
  const [expertReviews, setExpertReviews] = useState<ClinicalQueueItem[]>([])
  const [totalQueue, setTotalQueue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await adminApi.clinicalQueue.get()
      setTeleconsults(res.teleconsults)
      setExpertReviews(res.expertReviews)
      setTotalQueue(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clinical queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  // 15s tick + focus/visibility (was a plain 30s setInterval); pauses on
  // hidden tabs so background views don't churn the API.
  useAutoRefresh(load, 15_000)

  const activeTeleconsults = teleconsults.filter((i) => i.status === 'active' || i.status === 'in_progress').length
  const activeER = expertReviews.filter((i) => i.status === 'active' || i.status === 'in_progress').length

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Clinical Queue
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Live queue — refreshes every 30 seconds
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Total in Queue"
          value={totalQueue}
          icon={<Activity className="w-5 h-5" style={{ color: '#6DC43F' }} />}
        />
        <KpiCard
          label="Active Teleconsults"
          value={activeTeleconsults}
          icon={<Video className="w-5 h-5" style={{ color: '#6DC43F' }} />}
        />
        <KpiCard
          label="Active Expert Reviews"
          value={activeER}
          icon={<FileSearch className="w-5 h-5" style={{ color: '#6DC43F' }} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teleconsults */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Teleconsults
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#6DC43F22', color: '#6DC43F' }}
            >
              {teleconsults.length}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBox key={i} height={80} className="rounded-xl" />
              ))}
            </div>
          ) : teleconsults.length === 0 ? (
            <Card>
              <CardTitle>No teleconsults in queue</CardTitle>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                The teleconsult queue is currently empty.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {teleconsults.map((item) => (
                <QueueCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Expert Reviews */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileSearch className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Expert Reviews
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#6DC43F22', color: '#6DC43F' }}
            >
              {expertReviews.length}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBox key={i} height={80} className="rounded-xl" />
              ))}
            </div>
          ) : expertReviews.length === 0 ? (
            <Card>
              <CardTitle>No expert reviews in queue</CardTitle>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                The expert review queue is currently empty.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {expertReviews.map((item) => (
                <QueueCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

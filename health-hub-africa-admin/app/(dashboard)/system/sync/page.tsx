'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, RotateCcw, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

interface SyncItem {
  id: string
  patientId: string
  patientName?: string
  patientEmail?: string
  openemrPatientId?: string
  status: SyncStatus
  attempts: number
  lastAttemptAt?: string
  errorMessage?: string
  createdAt: string
}

const STATUS_PILL: Record<SyncStatus, 'success' | 'warning' | 'emergency' | 'info'> = {
  synced: 'success',
  pending: 'warning',
  syncing: 'info',
  failed: 'emergency',
}

export default function SyncPage() {
  const [items, setItems] = useState<SyncItem[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.system.syncQueue()
      setItems(res.data as SyncItem[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRetry = async (id: string) => {
    setRetrying(id)
    try {
      await adminApi.system.retrySyncItem(id)
      toast.success('Retry queued')
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Retry failed')
    } finally {
      setRetrying(null)
    }
  }

  const counts = {
    pending: items.filter((i) => i.status === 'pending').length,
    failed: items.filter((i) => i.status === 'failed').length,
    synced: items.filter((i) => i.status === 'synced').length,
  }

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            OpenEMR Sync Queue
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Patient record synchronisation status
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard
          label="Pending"
          value={loading ? '—' : counts.pending}
          icon={<Clock className="w-4 h-4" />}
          pillText={counts.pending > 0 ? 'queued' : undefined}
          pillVariant="warning"
        />
        <KpiCard
          label="Failed"
          value={loading ? '—' : counts.failed}
          icon={<AlertCircle className="w-4 h-4" />}
          pillText={counts.failed > 0 ? 'needs retry' : undefined}
          pillVariant="emergency"
        />
        <KpiCard
          label="Synced"
          value={loading ? '—' : counts.synced}
          icon={<CheckCircle2 className="w-4 h-4" />}
          pillText={counts.synced > 0 ? 'complete' : undefined}
          pillVariant="success"
        />
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Patient', 'OpenEMR ID', 'Status', 'Attempts', 'Last attempt', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {[160, 80, 70, 50, 120, 60].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Sync queue is empty
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {item.patientName ?? item.patientId}
                      </p>
                      {item.errorMessage && (
                        <p
                          className="text-xs mt-0.5 truncate max-w-[220px]"
                          style={{ color: 'var(--color-emergency)' }}
                          title={item.errorMessage}
                        >
                          {item.errorMessage}
                        </p>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {item.openemrPatientId ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={STATUS_PILL[item.status] ?? 'neutral'}>{item.status}</Pill>
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {item.attempts}
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {item.lastAttemptAt ? formatDateTime(item.lastAttemptAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'failed' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={retrying === item.id}
                          onClick={() => handleRetry(item.id)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

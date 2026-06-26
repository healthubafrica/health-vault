'use client'

import { useState } from 'react'
import { adminApi } from '@/lib/api'
import { useLiveData } from '@/lib/hooks/useLiveData'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, Ambulance, AlertTriangle, CheckCircle2, X } from 'lucide-react'

type DispatchStatus = 'pending' | 'dispatched' | 'en_route' | 'on_scene' | 'resolved' | 'cancelled'

type TriagePriority = 'immediate' | 'urgent' | 'delayed' | 'minimal'

interface DispatchRequest {
  id: string
  patientName?: string
  patientAddress?: string
  triagePriority: TriagePriority
  status: DispatchStatus
  responderName?: string
  createdAt: string
  resolvedAt?: string
}

const STATUS_PILL: Record<DispatchStatus, 'emergency' | 'warning' | 'info' | 'success' | 'neutral'> = {
  pending: 'emergency',
  dispatched: 'warning',
  en_route: 'info',
  on_scene: 'info',
  resolved: 'success',
  cancelled: 'neutral',
}

const TRIAGE_PILL: Record<TriagePriority, 'emergency' | 'warning' | 'info' | 'success'> = {
  immediate: 'emergency',
  urgent: 'warning',
  delayed: 'info',
  minimal: 'success',
}

function DispatchDetailDialog({
  request,
  onClose,
}: {
  request: DispatchRequest
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {request.patientName ?? 'Dispatch Request'}
            </h2>
            <Pill variant={STATUS_PILL[request.status] ?? 'neutral'}>{request.status.replace('_', ' ')}</Pill>
            <Pill variant={TRIAGE_PILL[request.triagePriority] ?? 'neutral'}>{request.triagePriority}</Pill>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Patient Address</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
              {request.patientAddress ?? '—'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Responder</p>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>{request.responderName ?? 'Not yet assigned'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Created</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDateTime(request.createdAt)}</p>
            </div>
            {request.resolvedAt && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Resolved</p>
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDateTime(request.resolvedAt)}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Dispatch ID</p>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{request.id}</p>
          </div>
        </div>

        <div className="flex justify-end px-5 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default function DispatchPage() {
  const [selected, setSelected] = useState<DispatchRequest | null>(null)

  const { data: res, isInitialLoad, refresh } = useLiveData(
    () => adminApi.operations.dispatch(),
    [],
    // Dispatch is the most time-critical surface — emergency cases shouldn't
    // wait 20s to surface. Poll every 10s.
    { intervalMs: 10_000 },
  )

  const requests: DispatchRequest[] = (res?.data as DispatchRequest[]) ?? []
  const loading = isInitialLoad

  const active = requests.filter((r) =>
    ['pending', 'dispatched', 'en_route', 'on_scene'].includes(r.status),
  )
  const resolved = requests.filter((r) => r.status === 'resolved')

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Dispatch
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Emergency response and STRIDE triage
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <KpiCard
          label="Active"
          value={loading ? '—' : active.length}
          icon={<Ambulance className="w-4 h-4" />}
          pillText={active.length > 0 ? 'in progress' : undefined}
          pillVariant="emergency"
        />
        <KpiCard
          label="Pending triage"
          value={loading ? '—' : requests.filter((r) => r.status === 'pending').length}
          icon={<AlertTriangle className="w-4 h-4" />}
          pillText={requests.filter((r) => r.status === 'pending').length > 0 ? 'awaiting' : undefined}
          pillVariant="warning"
        />
        <KpiCard
          label="Resolved today"
          value={loading ? '—' : resolved.length}
          icon={<CheckCircle2 className="w-4 h-4" />}
          pillVariant="success"
        />
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Patient', 'Location', 'Triage', 'Responder', 'Status', 'Time'].map((h) => (
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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {[140, 160, 70, 120, 80, 110].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No active dispatch requests
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--color-bg)]"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      {r.patientName ?? '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-xs max-w-[180px]"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <span className="truncate block" title={r.patientAddress}>
                        {r.patientAddress ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={TRIAGE_PILL[r.triagePriority] ?? 'neutral'}>
                        {r.triagePriority}
                      </Pill>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {r.responderName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={STATUS_PILL[r.status] ?? 'neutral'}>
                        {r.status.replace('_', ' ')}
                      </Pill>
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {formatDateTime(r.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && <DispatchDetailDialog request={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

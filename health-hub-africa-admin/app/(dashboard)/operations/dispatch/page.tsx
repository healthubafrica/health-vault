'use client'

import { useEffect, useState } from 'react'
import { adminApi, type DispatchCaseDetail, type DispatchUnit } from '@/lib/api'
import { useLiveData } from '@/lib/hooks/useLiveData'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, Ambulance, AlertTriangle, CheckCircle2, X, MapPin } from 'lucide-react'

// Mirrors the API's DispatchStatus FSM (dispatch.service.ts TRANSITIONS).
type DispatchStatus =
  | 'requested'
  | 'triaged'
  | 'unit_assigned'
  | 'en_route'
  | 'on_scene'
  | 'patient_stabilised'
  | 'transported'
  | 'closed'

const NEXT_STATUSES: Record<DispatchStatus, DispatchStatus[]> = {
  requested: ['triaged', 'closed'],
  triaged: ['unit_assigned', 'closed'],
  unit_assigned: ['en_route', 'closed'],
  en_route: ['on_scene'],
  on_scene: ['patient_stabilised', 'transported', 'closed'],
  patient_stabilised: ['transported', 'closed'],
  transported: ['closed'],
  closed: [],
}

const STATUS_PILL: Record<DispatchStatus, 'emergency' | 'warning' | 'info' | 'success' | 'neutral'> = {
  requested: 'emergency',
  triaged: 'warning',
  unit_assigned: 'warning',
  en_route: 'info',
  on_scene: 'info',
  patient_stabilised: 'success',
  transported: 'success',
  closed: 'neutral',
}

const ACTIVE_STATUSES: DispatchStatus[] = [
  'requested', 'triaged', 'unit_assigned', 'en_route', 'on_scene', 'patient_stabilised', 'transported',
]

interface DispatchRow {
  id: string
  hhaRef: string
  patientName?: string
  patientAddress?: string
  emergencyType?: string
  etaMinutes?: number
  triagePriority?: string
  status: DispatchStatus
  responderName?: string
  createdAt: string
  resolvedAt?: string
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ')
}

function CaseDialog({
  row,
  onClose,
  onChanged,
}: {
  row: DispatchRow
  onClose: () => void
  onChanged: () => void
}) {
  const [detail, setDetail] = useState<DispatchCaseDetail | null>(null)
  const [units, setUnits] = useState<DispatchUnit[]>([])
  const [nextStatus, setNextStatus] = useState('')
  const [unitId, setUnitId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    adminApi.operations.dispatchDetail(row.id)
      .then((res) => setDetail(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load case'))
  }

  useEffect(() => {
    load()
    adminApi.operations.dispatchUnits()
      .then((res) => setUnits(res.data))
      .catch(() => null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id])

  const currentStatus = (detail?.status ?? row.status) as DispatchStatus
  const allowed = NEXT_STATUSES[currentStatus] ?? []

  const handleAdvance = async () => {
    if (!nextStatus) return
    setSaving(true)
    setError(null)
    try {
      await adminApi.operations.dispatchUpdateStatus(row.id, {
        status: nextStatus,
        notes: notes.trim() || undefined,
        ...(nextStatus === 'unit_assigned' && unitId ? { assignedProviderId: unitId } : {}),
      })
      setNextStatus('')
      setUnitId('')
      setNotes('')
      load()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[88vh]"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {row.patientName ?? 'Dispatch Case'}
            </h2>
            <span className="text-xs font-mono" style={{ color: 'var(--color-text-faint)' }}>{row.hhaRef}</span>
            <Pill variant={STATUS_PILL[currentStatus] ?? 'neutral'}>{statusLabel(currentStatus)}</Pill>
            {row.triagePriority && <Pill variant="warning">{row.triagePriority}</Pill>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--color-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Emergency</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                {statusLabel(detail?.emergencyType ?? row.emergencyType ?? '—')}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Responder Unit</p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{row.responderName ?? 'Not yet assigned'}</p>
            </div>
          </div>

          {detail?.description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{detail.description}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Location</p>
            <p className="text-sm flex items-start gap-1.5" style={{ color: 'var(--color-text)' }}>
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <span>
                {detail?.locationText ?? row.patientAddress ?? '—'}
                {detail?.latitude && detail?.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${detail.latitude},${detail.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs underline mt-0.5"
                    style={{ color: '#6AADFF' }}
                  >
                    Open in Maps ({detail.latitude}, {detail.longitude})
                  </a>
                )}
              </span>
            </p>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Timeline</p>
            {!detail ? (
              <SkeletonBox height={60} className="rounded-xl" />
            ) : detail.events.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>No status events yet</p>
            ) : (
              <div className="space-y-2">
                {detail.events.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#6DC43F' }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium capitalize" style={{ color: 'var(--color-text)' }}>
                        {statusLabel(ev.status)}
                        <span className="font-normal ml-2" style={{ color: 'var(--color-text-faint)' }}>
                          {formatDateTime(ev.occurredAt)}
                        </span>
                      </p>
                      {ev.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{ev.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advance status */}
          {allowed.length > 0 && (
            <div
              className="rounded-xl p-3 space-y-3"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Advance Case
              </p>
              <div className="flex gap-2">
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl text-sm border outline-none cursor-pointer"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="">Next status…</option>
                  {allowed.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
                {nextStatus === 'unit_assigned' && (
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl text-sm border outline-none cursor-pointer"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <option value="">Assign unit…</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id} disabled={!u.isAvailable}>
                        {u.callSign} · {u.unitType}{u.isAvailable ? '' : ' (busy)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for the timeline (optional)"
                className="w-full rounded-xl px-3 py-2 text-sm resize-none border outline-none"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  loading={saving}
                  disabled={!nextStatus || (nextStatus === 'unit_assigned' && units.length > 0 && !unitId)}
                  onClick={handleAdvance}
                >
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default function DispatchPage() {
  const [selected, setSelected] = useState<DispatchRow | null>(null)

  const { data: res, isInitialLoad, refresh } = useLiveData(
    () => adminApi.operations.dispatch(),
    [],
    // Dispatch is the most time-critical surface — emergency cases shouldn't
    // wait 20s to surface. Poll every 10s.
    { intervalMs: 10_000 },
  )

  const requests: DispatchRow[] = (res?.data as DispatchRow[]) ?? []
  const loading = isInitialLoad

  const active = requests.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const awaitingTriage = requests.filter((r) => r.status === 'requested')
  const closed = requests.filter((r) => r.status === 'closed')

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
          label="Active cases"
          value={loading ? '—' : active.length}
          icon={<Ambulance className="w-4 h-4" />}
          pillText={active.length > 0 ? 'in progress' : undefined}
          pillVariant="emergency"
        />
        <KpiCard
          label="Awaiting triage"
          value={loading ? '—' : awaitingTriage.length}
          icon={<AlertTriangle className="w-4 h-4" />}
          pillText={awaitingTriage.length > 0 ? 'action needed' : undefined}
          pillVariant="warning"
        />
        <KpiCard
          label="Closed"
          value={loading ? '—' : closed.length}
          icon={<CheckCircle2 className="w-4 h-4" />}
          pillVariant="success"
        />
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Case', 'Patient', 'Emergency', 'Location', 'Unit', 'Status', 'Time'].map((h) => (
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
                    {[90, 140, 100, 160, 90, 90, 110].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No dispatch requests
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
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {r.hhaRef}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>
                      {r.patientName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--color-text)' }}>
                      {r.emergencyType ? statusLabel(r.emergencyType) : '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-xs max-w-[160px]"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      <span className="truncate block" title={r.patientAddress}>
                        {r.patientAddress ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {r.responderName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={STATUS_PILL[r.status] ?? 'neutral'}>
                        {statusLabel(r.status)}
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

      {selected && (
        <CaseDialog
          row={selected}
          onClose={() => setSelected(null)}
          onChanged={refresh}
        />
      )}
    </div>
  )
}

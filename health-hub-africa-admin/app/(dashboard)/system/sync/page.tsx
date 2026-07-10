'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import {
  RefreshCw, RotateCcw, Clock, AlertCircle, CheckCircle2,
  X, ShieldCheck, ShieldX, ExternalLink, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'
type AuthStatus = 'checking' | 'connected' | 'disconnected'

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

function SyncDetailDialog({
  item,
  onClose,
  onRetry,
  retrying,
}: {
  item: SyncItem
  onClose: () => void
  onRetry: (id: string) => void
  retrying: string | null
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Sync Record Detail
            </h2>
            <Pill variant={STATUS_PILL[item.status] ?? 'neutral'}>{item.status}</Pill>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Patient
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {item.patientName ?? item.patientId}
            </p>
            {item.patientEmail && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {item.patientEmail}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                HHA Patient ID
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>
                {item.patientId}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                OpenEMR Patient ID
              </p>
              <p className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>
                {item.openemrPatientId ?? '—'}
              </p>
            </div>
          </div>

          {item.errorMessage && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Error Message
              </p>
              <div
                className="p-3 rounded-xl text-xs leading-relaxed font-mono"
                style={{
                  background: 'var(--color-error-bg)',
                  color: 'var(--color-emergency)',
                  border: '1px solid var(--color-emergency)',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {item.errorMessage}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Sync Attempts
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {item.attempts}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Sync Record ID
              </p>
              <p className="text-xs font-mono truncate" style={{ color: 'var(--color-text-muted)' }}>
                {item.id}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Queued At
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                {formatDateTime(item.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Last Attempt
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                {item.lastAttemptAt ? formatDateTime(item.lastAttemptAt) : '—'}
              </p>
            </div>
          </div>
        </div>

        <div
          className="flex justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          {item.status === 'failed' && (
            <Button
              size="sm"
              loading={retrying === item.id}
              onClick={() => onRetry(item.id)}
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function OpenEMRConnectionBanner() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [authorising, setAuthorising] = useState(false)
  const [awaitingCallback, setAwaitingCallback] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const checkStatus = async () => {
    try {
      const res = await adminApi.openemr.authInit()
      setAuthStatus(res.isAuthenticated ? 'connected' : 'disconnected')
      return res
    } catch {
      setAuthStatus('disconnected')
      return null
    }
  }

  useEffect(() => { void checkStatus() }, [])

  const handleAuthorise = async () => {
    setAuthorising(true)
    try {
      const res = await adminApi.openemr.authInit()
      setAuthStatus(res.isAuthenticated ? 'connected' : 'disconnected')

      if (res.isAuthenticated) {
        toast.success('OpenEMR is already connected')
        return
      }

      // Open the OpenEMR authorization page in a new tab.
      // The backend callback at /api/v1/openemr/auth/callback handles the
      // code exchange automatically once the admin approves in OpenEMR.
      window.open(res.authorizationUrl, '_blank', 'noopener,noreferrer')
      setAwaitingCallback(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to start authorization')
    } finally {
      setAuthorising(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const res = await checkStatus()
      if (res?.isAuthenticated) {
        setAwaitingCallback(false)
        toast.success('OpenEMR connected successfully')
      } else {
        toast.error('Not yet authorized — complete the approval in the OpenEMR tab first')
      }
    } finally {
      setVerifying(false)
    }
  }

  if (authStatus === 'checking') {
    return (
      <div
        className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
      >
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Checking OpenEMR connection…
        </p>
      </div>
    )
  }

  if (authStatus === 'connected' && !awaitingCallback) {
    return (
      <div
        className="mb-5 flex items-center justify-between px-4 py-3 rounded-xl border"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: '#6DC43F' }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              OpenEMR Connected
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Active OAuth2 session — patient sync is operational
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleAuthorise} loading={authorising}>
          Re-authorise
        </Button>
      </div>
    )
  }

  if (awaitingCallback) {
    return (
      <div
        className="mb-5 px-4 py-4 rounded-xl border"
        style={{ background: 'var(--color-bg)', borderColor: '#6AADFF', borderWidth: 1 }}
      >
        <div className="flex items-start gap-3">
          <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" style={{ color: '#6AADFF' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              Waiting for authorization
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              OpenEMR has opened in a new tab. Log in, approve the requested permissions, then come back here and click <span className="font-medium" style={{ color: 'var(--color-text)' }}>Verify Connection</span>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" onClick={handleVerify} loading={verifying}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verify Connection
          </Button>
          <Button variant="secondary" size="sm" onClick={handleAuthorise} loading={authorising}>
            <ExternalLink className="w-3.5 h-3.5" />
            Open Again
          </Button>
          <button
            className="text-xs ml-auto"
            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setAwaitingCallback(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // disconnected
  return (
    <div
      className="mb-5 px-4 py-4 rounded-xl border"
      style={{ background: 'var(--color-error-bg)', borderColor: 'var(--color-emergency)' }}
    >
      <div className="flex items-start gap-3">
        <ShieldX className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-emergency)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-emergency)' }}>
            OpenEMR Not Authorised
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Patient sync is paused. Click <span className="font-medium" style={{ color: 'var(--color-text)' }}>Authorise OpenEMR</span> to open the OpenEMR login in a new tab — once you approve permissions, the backend connects automatically.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Button size="sm" onClick={handleAuthorise} loading={authorising}>
          <ExternalLink className="w-3.5 h-3.5" />
          Authorise OpenEMR
        </Button>
      </div>
    </div>
  )
}

export default function SyncPage() {
  const [items, setItems] = useState<SyncItem[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [recovering, setRecovering] = useState(false)
  const [recoveringCalendar, setRecoveringCalendar] = useState(false)
  const [selected, setSelected] = useState<SyncItem | null>(null)

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
      setSelected(null)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Retry failed')
    } finally {
      setRetrying(null)
    }
  }

  const handleRecoverAll = async () => {
    if (!window.confirm('Re-enqueue all patients with no OpenEMR UUID for sync? This recovers patients who joined while OpenEMR was offline.')) return
    setRecovering(true)
    try {
      const res = await adminApi.openemr.recoverAll()
      toast.success(`${res.enqueued} patient${res.enqueued === 1 ? '' : 's'} queued for sync`)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Recovery failed')
    } finally {
      setRecovering(false)
    }
  }

  const handleRecoverAppointmentCalendarSync = async () => {
    if (!window.confirm('Re-enqueue calendar sync for every confirmed appointment missing an OpenEMR event? Use this after fixing an OpenEMR OAuth/scope issue.')) return
    setRecoveringCalendar(true)
    try {
      const res = await adminApi.openemr.recoverAppointmentCalendarSync()
      toast.success(`${res.enqueued} appointment${res.enqueued === 1 ? '' : 's'} queued for calendar sync`)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Recovery failed')
    } finally {
      setRecoveringCalendar(false)
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
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={recovering}
            onClick={handleRecoverAll}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Recover Unsynced
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={recoveringCalendar}
            onClick={handleRecoverAppointmentCalendarSync}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Recover Appointment Calendar Sync
          </Button>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <OpenEMRConnectionBanner />

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
                    className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--color-bg)]"
                    style={{ borderColor: 'var(--color-border)' }}
                    onClick={() => setSelected(item)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {item.patientName ?? item.patientId}
                      </p>
                      {item.errorMessage && (
                        <p
                          className="text-xs mt-0.5 truncate max-w-[220px]"
                          style={{ color: 'var(--color-emergency)' }}
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
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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

      {selected && (
        <SyncDetailDialog
          item={selected}
          onClose={() => setSelected(null)}
          onRetry={handleRetry}
          retrying={retrying}
        />
      )}
    </div>
  )
}

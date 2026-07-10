'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type ShareSummary, type ShareActivity, type ShareAccessAction } from '@/lib/api'
import { useAutoRefresh } from '@/lib/hooks/useLiveData'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, X, Send, CheckCheck, MousePointerClick, Clock, Ban, ShieldAlert, KeyRound } from 'lucide-react'

function shareStatusVariant(share: ShareSummary): 'success' | 'warning' | 'emergency' | 'neutral' {
  if (share.isRevoked) return 'emergency'
  if (share.isExpired) return 'neutral'
  return 'success'
}

function shareStatusLabel(share: ShareSummary): string {
  if (share.isRevoked) return 'Revoked'
  if (share.isExpired) return 'Expired'
  return 'Active'
}

const ACTION_META: Record<ShareAccessAction, { label: string; icon: React.ElementType; variant: 'success' | 'warning' | 'emergency' | 'neutral' | 'info' }> = {
  link_sent: { label: 'Link sent', icon: Send, variant: 'info' },
  link_delivered: { label: 'Delivered', icon: CheckCheck, variant: 'success' },
  link_opened: { label: 'Link opened', icon: MousePointerClick, variant: 'success' },
  otp_sent: { label: 'OTP sent', icon: KeyRound, variant: 'info' },
  otp_verified: { label: 'OTP verified', icon: KeyRound, variant: 'success' },
  otp_failed: { label: 'OTP failed', icon: KeyRound, variant: 'warning' },
  viewed: { label: 'Records viewed', icon: MousePointerClick, variant: 'success' },
  forward_detected: { label: 'Forwarding suspected', icon: ShieldAlert, variant: 'warning' },
  revoked: { label: 'Revoked', icon: Ban, variant: 'emergency' },
  share_expired: { label: 'Expired', icon: Clock, variant: 'neutral' },
}

function ShareActivityDrawer({ shareId, onClose }: { shareId: string; onClose: () => void }) {
  const [activity, setActivity] = useState<ShareActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminApi.shares.activity(shareId)
      .then((res) => { if (!cancelled) setActivity(res) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load share activity') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [shareId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {activity ? activity.share.patientName : 'Share activity'}
            </h2>
            {activity && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {activity.share.label || activity.share.recordTypes.join(', ') || 'General health records'}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} height={40} className="rounded-xl" />)}
            </div>
          ) : activity && activity.accesses.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              No activity recorded for this share yet.
            </p>
          ) : activity ? (
            <ol className="flex flex-col gap-3">
              {activity.accesses.map((access) => {
                const meta = ACTION_META[access.action] ?? { label: access.action, icon: Clock, variant: 'neutral' as const }
                const Icon = meta.icon
                return (
                  <li key={access.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--color-bg)' }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill variant={meta.variant}>{meta.label}</Pill>
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                          {formatDateTime(access.occurredAt)}
                        </span>
                      </div>
                      {access.visitorEmail && (
                        <p className="text-xs mt-1 truncate" style={{ color: 'var(--color-text)' }}>{access.visitorEmail}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function SharesPage() {
  const [shares, setShares] = useState<ShareSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [activeShareId, setActiveShareId] = useState<string | null>(null)
  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.shares.list({ page, limit })
      setShares(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load share activity')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])
  useAutoRefresh(load, 20_000)

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Share Activity
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} secure share links · sent, delivered, opened, and expiry audit trail
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>
          {error}
        </div>
      )}

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Patient', 'Label / Records', 'Recipients', 'Status', 'Expires', 'Activity', ''].map((h) => (
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
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: j === 1 ? 160 : 90 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : shares.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No shares found
                  </td>
                </tr>
              ) : (
                shares.map((share) => (
                  <tr key={share.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{share.patientName}</td>
                    <td className="px-4 py-3 max-w-[220px] truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {share.label || share.recordTypes.join(', ') || 'General health records'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {share.allowedEmails.length} email{share.allowedEmails.length === 1 ? '' : 's'}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={shareStatusVariant(share)}>{shareStatusLabel(share)}</Pill>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {share.expiresAt ? formatDateTime(share.expiresAt) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {share.accessCount} event{share.accessCount === 1 ? '' : 's'}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="secondary" size="sm" onClick={() => setActiveShareId(share.id)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Page {page} of {totalPages} · {total} records
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {activeShareId && (
        <ShareActivityDrawer shareId={activeShareId} onClose={() => setActiveShareId(null)} />
      )}
    </div>
  )
}

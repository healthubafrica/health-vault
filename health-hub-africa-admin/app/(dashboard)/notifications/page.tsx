'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type NotificationDelivery } from '@/lib/api'
import { useAutoRefresh } from '@/lib/hooks/useLiveData'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, RotateCcw, CheckCircle } from 'lucide-react'

const CHANNEL_TABS = ['all', 'email', 'sms', 'push']

function statusVariant(status: string): 'success' | 'warning' | 'emergency' | 'neutral' {
  if (status === 'sent' || status === 'delivered') return 'success'
  if (status === 'failed') return 'emergency'
  return 'neutral'
}

function channelVariant(channel: string): 'info' | 'success' | 'neutral' {
  if (channel === 'email') return 'info'
  if (channel === 'sms') return 'success'
  return 'neutral'
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationDelivery[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channelTab, setChannelTab] = useState('all')
  const [page, setPage] = useState(1)
  const [resending, setResending] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)
  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Parameters<typeof adminApi.notifications.list>[0] = { page, limit }
      if (channelTab !== 'all') params.channel = channelTab
      const res = await adminApi.notifications.list(params)
      setNotifications(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [page, channelTab])

  useEffect(() => { load() }, [load])
  useAutoRefresh(load, 20_000)

  const handleResend = useCallback(async (id: string, recipient: string) => {
    setResending(id)
    try {
      await adminApi.notifications.resend(id)
      setSuccessBanner(`Notification resent to ${recipient}`)
      setTimeout(() => setSuccessBanner(null), 4000)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend notification')
    } finally {
      setResending(null)
    }
  }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Notifications
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total.toLocaleString()} delivery records
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {successBanner && (
        <div
          className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-success-bg)', color: '#6DC43F' }}
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successBanner}
        </div>
      )}

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

      <FilterTabs
        tabs={CHANNEL_TABS}
        active={channelTab}
        onChange={(t) => { setChannelTab(t); setPage(1) }}
        className="mb-4"
      />

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Channel', 'Recipient', 'Subject', 'Status', 'Sent At', 'Actions'].map((h) => (
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
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: j === 1 ? 160 : 90 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No notifications found
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr
                    key={n.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <Pill variant={channelVariant(n.channel)}>{n.channel}</Pill>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: 'var(--color-text)' }}>
                      {n.recipient}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {n.subject ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={statusVariant(n.status)}>{n.status}</Pill>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {n.sentAt ? formatDateTime(n.sentAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {n.status === 'failed' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={resending === n.id}
                          onClick={() => handleResend(n.id, n.recipient)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Resend
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
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
    </div>
  )
}

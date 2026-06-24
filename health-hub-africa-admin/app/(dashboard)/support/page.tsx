'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type AdminSupportTicket } from '@/lib/api'
import { useAutoRefresh } from '@/lib/hooks/useLiveData'
import { Card } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { RefreshCw, MessageSquare, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
type TicketPriority = 'urgent' | 'high' | 'medium' | 'low'

interface SupportTicket {
  id: string
  subject: string
  userEmail: string
  userName?: string
  assigneeName?: string
  category?: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  updatedAt: string
  messageCount?: number
}

const STATUS_TABS = ['All', 'open', 'in_progress', 'waiting', 'resolved', 'closed']

const STATUS_PILL: Record<TicketStatus, 'emergency' | 'info' | 'warning' | 'success' | 'neutral'> = {
  open: 'emergency',
  in_progress: 'info',
  waiting: 'warning',
  resolved: 'success',
  closed: 'neutral',
}

const PRIORITY_PILL: Record<TicketPriority, 'emergency' | 'warning' | 'info' | 'neutral'> = {
  urgent: 'emergency',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState('All')
  const [page, setPage] = useState(1)
  const limit = 25

  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const status = statusTab !== 'All' ? statusTab : undefined
      const raw = await adminApi.support.list(status)
      const mapped: SupportTicket[] = raw.map((t: AdminSupportTicket) => {
        const submitterName = t.submitter.patient
          ? `${t.submitter.patient.firstName} ${t.submitter.patient.lastName}`
          : t.submitter.provider
            ? `${t.submitter.provider.firstName} ${t.submitter.provider.lastName}`
            : undefined
        const assigneeName = t.assignee
          ? (t.assignee.patient
              ? `${t.assignee.patient.firstName} ${t.assignee.patient.lastName}`
              : t.assignee.provider
                ? `${t.assignee.provider.firstName} ${t.assignee.provider.lastName}`
                : t.assignee.email)
          : undefined
        return {
          id: t.id,
          subject: t.subject,
          userEmail: t.submitter.email,
          userName: submitterName,
          assigneeName,
          category: t.category,
          status: t.status as TicketStatus,
          priority: (t.priority === 'normal' ? 'medium' : t.priority) as TicketPriority,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          messageCount: t._count.messages,
        }
      })
      setTotal(mapped.length)
      const start = (page - 1) * limit
      setTickets(mapped.slice(start, start + limit))
    } catch {
      setTickets([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusTab])

  useEffect(() => { setPage(1) }, [statusTab])
  useEffect(() => { load() }, [load])
  useAutoRefresh(load, 30_000)

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Support Tickets
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total > 0 ? `${total.toLocaleString()} tickets` : 'Patient support requests'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      <FilterTabs
        tabs={STATUS_TABS}
        active={statusTab}
        onChange={(t) => setStatusTab(t)}
        className="mb-4"
      />

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Subject', 'User', 'Assignee', 'Category', 'Priority', 'Status', 'Updated'].map((h) => (
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
                    {[200, 140, 100, 80, 60, 70, 110].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <MessageSquare
                      className="w-7 h-7 mx-auto mb-3"
                      style={{ color: 'var(--color-text-faint)' }}
                    />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      No support tickets yet
                    </p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/support/${t.id}`)}
                    className="border-b last:border-b-0 cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        {t.messageCount != null && t.messageCount > 0 && (
                          <span
                            className="text-[10px] font-bold px-1 rounded"
                            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                          >
                            {t.messageCount}
                          </span>
                        )}
                        <span
                          className="truncate font-medium text-sm"
                          style={{ color: 'var(--color-text)' }}
                          title={t.subject}
                        >
                          {t.subject}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={t.userName ?? t.userEmail} size="xs" />
                        <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {t.userEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {t.assigneeName ?? <span style={{ color: 'var(--color-text-faint)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {t.category ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={PRIORITY_PILL[t.priority] ?? 'neutral'}>{t.priority}</Pill>
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={STATUS_PILL[t.status] ?? 'neutral'}>
                        {t.status.replace('_', ' ')}
                      </Pill>
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {formatDateTime(t.updatedAt)}
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
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

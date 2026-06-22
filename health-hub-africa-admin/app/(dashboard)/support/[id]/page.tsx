'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { adminApi, type AdminSupportTicketDetail, type SupportMessage } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft, Send, RefreshCw } from 'lucide-react'

type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
type TicketPriority = 'urgent' | 'high' | 'medium' | 'low'

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

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'waiting', 'resolved', 'closed']

export default function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [ticket, setTicket] = useState<AdminSupportTicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.support.getTicket(id)
      setTicket(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (ticket) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [ticket?.messages.length])

  const handleSend = async () => {
    if (!reply.trim() || !ticket) return
    setSending(true)
    try {
      await adminApi.support.addMessage(id, reply.trim())
      setReply('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return
    setUpdatingStatus(true)
    try {
      await adminApi.support.updateStatus(id, newStatus)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const submitterName = ticket
    ? ticket.submitter.patient
      ? `${ticket.submitter.patient.firstName} ${ticket.submitter.patient.lastName}`
      : ticket.submitter.provider
        ? `${ticket.submitter.provider.firstName} ${ticket.submitter.provider.lastName}`
        : ticket.submitter.email
    : ''

  const isPatientMessage = (msg: SupportMessage) => msg.senderId === ticket?.submittedBy

  return (
    <div className="max-w-[900px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.push('/support')}
          className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors hover:bg-[var(--color-bg)]"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Back to tickets"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          {loading ? (
            <SkeletonBox height={20} className="rounded" style={{ width: 300 }} />
          ) : (
            <h1 className="text-base font-bold truncate" style={{ color: 'var(--color-text)' }}>
              {ticket?.subject ?? 'Ticket'}
            </h1>
          )}
          {ticket && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {ticket.hhaRef} · {submitterName}
            </p>
          )}
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

      {/* Ticket meta card */}
      <Card className="mb-4">
        {loading ? (
          <div className="flex flex-wrap gap-4">
            {[80, 60, 100, 120].map((w, i) => (
              <SkeletonBox key={i} height={14} className="rounded" style={{ width: w }} />
            ))}
          </div>
        ) : ticket ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Status</p>
              <div className="flex items-center gap-2">
                <Pill variant={STATUS_PILL[ticket.status as TicketStatus] ?? 'neutral'}>
                  {ticket.status.replace('_', ' ')}
                </Pill>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updatingStatus}
                  className="text-xs rounded-lg px-2 py-1 border outline-none"
                  style={{
                    background: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Priority</p>
              <Pill variant={PRIORITY_PILL[ticket.priority as TicketPriority] ?? 'neutral'}>
                {ticket.priority}
              </Pill>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Category</p>
              <span className="text-xs" style={{ color: 'var(--color-text)' }}>{ticket.category}</span>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Opened</p>
              <span className="text-xs" style={{ color: 'var(--color-text)' }}>{formatDateTime(ticket.createdAt)}</span>
            </div>

            {ticket.assignee && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Assignee</p>
                <span className="text-xs" style={{ color: 'var(--color-text)' }}>
                  {ticket.assignee.patient
                    ? `${ticket.assignee.patient.firstName} ${ticket.assignee.patient.lastName}`
                    : ticket.assignee.provider
                      ? `${ticket.assignee.provider.firstName} ${ticket.assignee.provider.lastName}`
                      : ticket.assignee.email}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </Card>

      {/* Message thread */}
      <Card padding={false} className="mb-4">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            {ticket ? `${ticket.messages.length} message${ticket.messages.length !== 1 ? 's' : ''}` : 'Messages'}
          </p>
        </div>

        <div className="flex flex-col gap-0 max-h-[500px] overflow-y-auto p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`flex gap-3 mb-4 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                <SkeletonBox height={32} className="rounded-full flex-shrink-0" style={{ width: 32 }} />
                <div className="flex flex-col gap-1.5" style={{ maxWidth: '70%' }}>
                  <SkeletonBox height={12} className="rounded" style={{ width: 80 }} />
                  <SkeletonBox height={60} className="rounded-xl" style={{ width: 240 }} />
                </div>
              </div>
            ))
          ) : ticket?.messages.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              No messages yet
            </p>
          ) : (
            ticket?.messages.map((msg) => {
              const isPatient = isPatientMessage(msg)
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 mb-4 ${isPatient ? '' : 'flex-row-reverse'}`}
                >
                  <Avatar
                    name={isPatient ? submitterName : 'Support Team'}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <div
                    className={`flex flex-col gap-1 ${isPatient ? 'items-start' : 'items-end'}`}
                    style={{ maxWidth: '72%' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                        {isPatient ? submitterName : 'Support Team'}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>
                    <div
                      className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                      style={{
                        background: isPatient ? 'var(--color-bg)' : 'var(--color-primary)',
                        color: isPatient ? 'var(--color-text)' : '#fff',
                        borderTopLeftRadius: isPatient ? 4 : undefined,
                        borderTopRightRadius: isPatient ? undefined : 4,
                      }}
                    >
                      {msg.body}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </Card>

      {/* Reply box */}
      <Card>
        <div className="flex gap-3 items-end">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
            }}
            placeholder="Write a reply… (Cmd+Enter to send)"
            rows={3}
            className="flex-1 resize-none text-sm rounded-xl px-3 py-2.5 outline-none border"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!reply.trim() || sending}
            size="sm"
            className="flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Sending…' : 'Reply'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

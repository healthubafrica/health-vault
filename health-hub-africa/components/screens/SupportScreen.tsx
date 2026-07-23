'use client'

import { useState } from 'react'
import { LifeBuoy, Plus, Send, X, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { FormInput, FormTextarea } from '@/components/ui/FormInput'
import { ErrorState } from '@/components/ui/ErrorState'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { formatDate } from '@/lib/utils'
import { support, type SupportTicket } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'

const STATUS_PILL: Record<string, 'success' | 'warning' | 'neutral' | 'emergency'> = {
  open: 'warning',
  in_progress: 'success',
  resolved: 'neutral',
  closed: 'neutral',
}

const CATEGORIES = ['General', 'Billing', 'Appointments', 'Technical', 'Records']

export function SupportScreen() {
  const { data: tickets, isInitialLoad, error, refetch } = useApi(() => support.list())
  const [showNew, setShowNew] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isInitialLoad) return <ListSkeleton ariaLabel="Loading support tickets" showAction />
  if (error && !tickets) return <ErrorState message={error} onRetry={refetch} />

  const handleCreate = async () => {
    if (subject.trim().length < 3 || description.trim().length < 10) {
      toast.error('Add a subject and describe the issue (at least 10 characters)')
      return
    }
    setCreating(true)
    try {
      await support.create({ subject: subject.trim(), description: description.trim(), category })
      toast.success('Ticket opened — our team will get back to you')
      setSubject('')
      setDescription('')
      setShowNew(false)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open ticket')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            Support
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Get help from the Health Hub Africa team
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew(v => !v)}>
          {showNew ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
          {showNew ? 'Close' : 'New Ticket'}
        </Button>
      </div>

      {showNew && (
        <Card>
          <div className="flex flex-col gap-3">
            <FormInput
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary of the issue"
            />
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Category</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className="text-xs px-3 py-1.5 rounded-xl border transition-colors"
                    style={{
                      borderColor: category === c ? '#6DC43F' : 'var(--color-border)',
                      background: category === c ? 'var(--color-success-bg)' : 'var(--color-bg)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <FormTextarea
              label="Describe the issue"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button size="sm" className="self-end" onClick={handleCreate} disabled={creating}>
              {creating ? 'Opening…' : 'Open Ticket'}
            </Button>
          </div>
        </Card>
      )}

      {(tickets?.length ?? 0) === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <LifeBuoy size={32} style={{ color: 'var(--color-text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No support tickets yet</p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets!.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              expanded={expandedId === ticket.id}
              onToggle={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TicketCard({ ticket, expanded, onToggle }: {
  ticket: SupportTicket
  expanded: boolean
  onToggle: () => void
}) {
  // The list endpoint returns only a message count; the thread is fetched
  // lazily when the ticket is expanded.
  const { data: detail, refetch: refetchDetail } = useApi(
    () => expanded ? support.get(ticket.id) : Promise.resolve(null as unknown as SupportTicket),
    [expanded],
  )
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'
  const messages = detail?.messages?.filter(m => !m.isInternal) ?? []

  const handleReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      await support.addMessage(ticket.id, reply.trim())
      setReply('')
      refetchDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card padding="none">
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{ticket.subject}</p>
            <Pill variant={STATUS_PILL[ticket.status] ?? 'neutral'}>{ticket.status.replace('_', ' ')}</Pill>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            <span title="Reference number for this ticket — quote it if you follow up.">{ticket.hhaRef}</span> · {ticket.category} · {formatDate(ticket.createdAt)}
          </p>
        </div>
        {expanded
          ? <ChevronUp size={16} style={{ color: 'var(--color-text-muted)' }} />
          : <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-col gap-2 py-3">
            {messages.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No messages yet</p>
            ) : (
              messages.map(m => (
                <div
                  key={m.id}
                  className="rounded-xl px-3 py-2"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>{m.body}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-faint)' }}>
                    {formatDate(m.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
          {!isClosed && (
            <div className="flex gap-2">
              <input
                className="flex-1 text-sm rounded-xl border px-3 py-2"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                placeholder="Write a reply…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() } }}
              />
              <Button size="sm" onClick={handleReply} disabled={sending || !reply.trim()} aria-label="Send reply">
                <Send size={14} />
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

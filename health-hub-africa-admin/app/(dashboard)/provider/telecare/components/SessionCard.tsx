'use client'

import { useState } from 'react'
import type { ProviderSession } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import {
  Video,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ExternalLink,
  ArrowRightLeft,
  Star,
} from 'lucide-react'
import { STATUS_PILL, isJoinable, isTransferable, calcAge, buildOpenEmrUrl } from './helpers'

export function SessionCard({
  session,
  joining,
  onJoin,
  onDocument,
  onTransfer,
}: {
  session: ProviderSession
  joining: boolean
  onJoin: (audioOnly: boolean) => void
  onDocument: () => void
  onTransfer?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [audioOnly, setAudioOnly] = useState(false)

  const patientName = session.patient
    ? `${session.patient.firstName} ${session.patient.lastName}`
    : 'Patient'

  const age = calcAge(session.patient?.dateOfBirth)
  const gender = session.patient?.gender ?? null
  const planName = session.patient?.subscriptions?.[0]?.plan?.name ?? null
  const openemrUuid = session.patient?.openemrPatientUuid ?? null

  const minutesUntil = Math.round(
    (new Date(session.scheduledAt).getTime() - Date.now()) / 60000,
  )
  const isSoon = minutesUntil >= 0 && minutesUntil <= 15
  const isOverdue = minutesUntil < 0 && session.status === 'scheduled'
  const isPast = session.status === 'completed' || session.status === 'cancelled' || session.status === 'missed'
  const hasNotes = session.notes && session.notes.length > 0
  const showTransfer = isTransferable(session.status) && onTransfer

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {session.patient?.profilePhotoUrl ? (
          <img
            src={session.patient.profilePhotoUrl}
            alt={patientName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-border)' }}
          >
            <User className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              {patientName}
            </p>
            {openemrUuid && (
              <a
                href={buildOpenEmrUrl(openemrUuid)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open patient chart in OpenEMR"
                className="inline-flex items-center gap-0.5 rounded p-0.5 hover:bg-[var(--color-border)] transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Pill variant={STATUS_PILL[session.status] ?? 'neutral'}>{session.status}</Pill>
            {hasNotes && (
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-text-faint)' }}>
                <CheckCircle className="w-3 h-3 text-[#6DC43F]" /> Documented
              </span>
            )}
            {session.patientRating != null && (
              <span
                className="flex items-center gap-0.5 text-xs font-medium"
                title={session.patientFeedback ?? undefined}
                style={{ color: 'var(--color-text-faint)' }}
              >
                <Star className="w-3 h-3 fill-current" style={{ color: '#F5A623' }} />
                {session.patientRating}/5
              </span>
            )}
            {isSoon && <span className="text-xs font-medium text-orange-500">Starting soon</span>}
            {isOverdue && <span className="text-xs font-medium text-red-500">Overdue</span>}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <Clock className="w-3 h-3" />
              {formatDateTime(session.scheduledAt)}
            </span>
            {age !== '—' && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{age}</span>
            )}
            {gender && (
              <span className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{gender.toLowerCase()}</span>
            )}
            {planName && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                {planName}
              </span>
            )}
            <span className="text-xs font-mono" style={{ color: 'var(--color-text-faint)' }}>
              {session.hhaRef}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {showTransfer && (
            <Button variant="secondary" size="sm" onClick={onTransfer}>
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transfer
            </Button>
          )}
          {isJoinable(session.status) && (
            <div className="flex flex-col items-end gap-1.5">
              <Button variant="primary" size="sm" loading={joining} onClick={() => onJoin(audioOnly)}>
                <Video className="w-3.5 h-3.5" />
                Join Call
              </Button>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={audioOnly}
                  onChange={(e) => setAudioOnly(e.target.checked)}
                  className="rounded accent-[#6DC43F] w-3 h-3"
                />
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Audio only</span>
              </label>
            </div>
          )}
          {isPast && !hasNotes && (
            <Button variant="secondary" size="sm" onClick={onDocument}>
              <FileText className="w-3.5 h-3.5" />
              Document
            </Button>
          )}
          {isPast && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg)]"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded
                ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                : <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              }
            </button>
          )}
        </div>
      </div>

      {expanded && isPast && (
        <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
          {hasNotes ? (
            session.notes!.map((note) => (
              <div key={note.id} className="text-xs space-y-1.5">
                {note.chiefComplaint && (
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>S — </span>
                    <span style={{ color: 'var(--color-text)' }}>{note.chiefComplaint}</span>
                  </div>
                )}
                {note.assessment && (
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>A — </span>
                    <span style={{ color: 'var(--color-text)' }}>{note.assessment}</span>
                  </div>
                )}
                {note.plan && (
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>P — </span>
                    <span style={{ color: 'var(--color-text)' }}>{note.plan}</span>
                  </div>
                )}
                <p className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>
                  Documented {formatDateTime(note.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>No encounter notes recorded.</p>
          )}
        </div>
      )}
    </Card>
  )
}

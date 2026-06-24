'use client'

import '@livekit/components-styles'
import { useEffect, useState, useCallback, useRef } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import {
  adminApi,
  type ProviderSession,
  type LiveKitJoinInfo,
  type ProviderSessionStatus,
  type SessionNote,
  type AvailableProvider,
} from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDateTime } from '@/lib/utils'
import {
  Video,
  RefreshCw,
  PhoneOff,
  PhoneCall,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  ExternalLink,
  Loader2,
  ArrowRightLeft,
} from 'lucide-react'

const STATUS_PILL: Record<ProviderSessionStatus, 'success' | 'warning' | 'neutral' | 'info' | 'emergency'> = {
  active: 'success',
  in_progress: 'success',
  scheduled: 'info',
  completed: 'neutral',
  cancelled: 'emergency',
  missed: 'warning',
}

function isJoinable(status: ProviderSessionStatus) {
  return status === 'scheduled' || status === 'active' || status === 'in_progress'
}

function isTransferable(status: ProviderSessionStatus) {
  return status === 'active' || status === 'in_progress'
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return '—'
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
  return `${years} yrs`
}

function buildOpenEmrUrl(uuid: string): string {
  const base = process.env.NEXT_PUBLIC_OPENEMR_URL ?? ''
  return `${base}/interface/patient_file/summary/demographics.php?set_pid=${uuid}`
}

// ── Incoming Call Banner ───────────────────────────────────────────────────────

function IncomingCallBanner({
  sessions,
  acceptingId,
  decliningId,
  onAccept,
  onDecline,
}: {
  sessions: ProviderSession[]
  acceptingId: string | null
  decliningId: string | null
  onAccept: (s: ProviderSession) => void
  onDecline: (s: ProviderSession) => void
}) {
  return (
    <div className="mb-5 space-y-2">
      {sessions.map((s) => {
        const patientName = s.patient
          ? `${s.patient.firstName} ${s.patient.lastName}`
          : 'A patient'
        const isAccepting = acceptingId === s.id
        const isDeclining = decliningId === s.id
        const busy = isAccepting || isDeclining

        return (
          <div
            key={s.id}
            className="rounded-xl px-4 py-3 flex items-center gap-4"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderLeft: '4px solid #6DC43F',
              boxShadow: '0 0 0 2px rgba(109,196,63,0.12)',
            }}
          >
            {/* Pulsing icon */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(109,196,63,0.12)' }}
            >
              <PhoneCall
                className="w-4 h-4 animate-pulse"
                style={{ color: '#6DC43F' }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {patientName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                is requesting a consultation
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                disabled={busy}
                onClick={() => onDecline(s)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--color-error-bg, rgba(239,68,68,0.08))',
                  borderColor: 'rgba(239,68,68,0.4)',
                  color: 'var(--color-emergency)',
                }}
                aria-label="Decline call"
              >
                {isDeclining ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PhoneOff className="w-3.5 h-3.5" />
                )}
                Decline
              </button>
              <button
                disabled={busy}
                onClick={() => onAccept(s)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
                style={{
                  background: 'rgba(109,196,63,0.12)',
                  borderColor: '#6DC43F',
                  color: '#6DC43F',
                }}
                aria-label="Accept call"
              >
                {isAccepting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PhoneCall className="w-3.5 h-3.5" />
                )}
                Accept
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Transfer Modal ─────────────────────────────────────────────────────────────

function TransferModal({
  session,
  onClose,
  onTransferred,
}: {
  session: ProviderSession
  onClose: () => void
  onTransferred: () => void
}) {
  const [providers, setProviders] = useState<AvailableProvider[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [transferring, setTransferring] = useState(false)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const patientName = session.patient
    ? `${session.patient.firstName} ${session.patient.lastName}`
    : 'Patient'

  useEffect(() => {
    setLoadingProviders(true)
    adminApi.providerTelecare
      .availableProviders()
      .then((data) => {
        setProviders(data)
        setLoadingProviders(false)
      })
      .catch(() => {
        setError('Could not load available providers')
        setLoadingProviders(false)
      })
  }, [])

  const handleTransfer = async () => {
    if (!selectedId) return
    setTransferring(true)
    setError(null)
    try {
      await adminApi.providerTelecare.transferSession(session.id, selectedId)
      onTransferred()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transfer failed')
    } finally {
      setTransferring(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              Transfer Session
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {patientName} · {session.hhaRef}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg)]"
            aria-label="Close"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {error && (
            <p
              className="text-sm px-3 py-2 rounded-lg mb-3"
              style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
            >
              {error}
            </p>
          )}

          {loadingProviders ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBox key={i} height={52} className="rounded-xl" />
              ))}
            </div>
          ) : providers.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: 'var(--color-text-faint)' }}
            >
              No available providers at the moment
            </p>
          ) : (
            <div className="space-y-1.5">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Select a provider
              </p>
              {providers.map((p) => {
                const selected = selectedId === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className="w-full text-left px-4 py-3 rounded-xl border transition-all"
                    style={
                      selected
                        ? {
                            background: 'rgba(109,196,63,0.08)',
                            borderColor: '#6DC43F',
                          }
                        : {
                            background: 'var(--color-bg)',
                            borderColor: 'var(--color-border)',
                          }
                    }
                    aria-pressed={selected}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--color-border)' }}
                      >
                        <User className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: selected ? '#6DC43F' : 'var(--color-text)' }}
                        >
                          {p.title} {p.firstName} {p.lastName}
                        </p>
                        <p
                          className="text-xs truncate"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {p.specialty}
                        </p>
                      </div>
                      {selected && (
                        <CheckCircle
                          className="w-4 h-4 ml-auto flex-shrink-0"
                          style={{ color: '#6DC43F' }}
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-4 border-t flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={transferring}
            onClick={handleTransfer}
            disabled={!selectedId || transferring}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── SOAP Notes Modal ──────────────────────────────────────────────────────────

interface SoapFormData {
  subjectiveNotes: string
  objectiveNotes: string
  assessment: string
  plan: string
  followUpInstructions: string
}

function SoapNotesModal({
  session,
  onClose,
  onSaved,
}: {
  session: ProviderSession
  onClose: () => void
  onSaved: (note: SessionNote) => void
}) {
  const [form, setForm] = useState<SoapFormData>({
    subjectiveNotes: '',
    objectiveNotes: '',
    assessment: '',
    plan: '',
    followUpInstructions: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patientName = session.patient
    ? `${session.patient.firstName} ${session.patient.lastName}`
    : 'Patient'

  const set = (field: keyof SoapFormData) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    if (!form.subjectiveNotes.trim()) {
      setError('Chief complaint / subjective notes are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const note = await adminApi.providerTelecare.createNote({
        sessionId: session.id,
        subjectiveNotes: form.subjectiveNotes,
        objectiveNotes: form.objectiveNotes || undefined,
        assessment: form.assessment || undefined,
        plan: form.plan || undefined,
        followUpInstructions: form.followUpInstructions || undefined,
      })
      onSaved(note)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              Document Encounter — {patientName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {session.hhaRef} · {formatDateTime(session.scheduledAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg)]">
            <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>
              {error}
            </p>
          )}

          {[
            { label: 'S — Chief Complaint / Subjective', key: 'subjectiveNotes' as const, required: true, placeholder: "Patient's chief complaint and subjective symptoms..." },
            { label: 'O — Objective Findings', key: 'objectiveNotes' as const, required: false, placeholder: 'Vital signs, physical exam findings...' },
            { label: 'A — Assessment / Diagnosis', key: 'assessment' as const, required: false, placeholder: 'Clinical impression and differential diagnosis...' },
            { label: 'P — Plan', key: 'plan' as const, required: false, placeholder: 'Treatment plan, prescriptions, referrals...' },
            { label: 'Follow-up Instructions', key: 'followUpInstructions' as const, required: false, placeholder: 'Instructions for patient, follow-up timing...' },
          ].map(({ label, key, required, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <textarea
                rows={3}
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
            <FileText className="w-3.5 h-3.5" />
            Save Note
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Session Card ──────────────────────────────────────────────────────────────

function SessionCard({
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
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--color-border)' }}
        >
          <User className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
        </div>

        {/* Info */}
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
            {isSoon && <span className="text-xs font-medium text-orange-500">Starting soon</span>}
            {isOverdue && <span className="text-xs font-medium text-red-500">Overdue</span>}
          </div>

          {/* Patient context chips */}
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

        {/* Actions */}
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

      {/* Expanded notes view */}
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

// ── Metrics Cards ─────────────────────────────────────────────────────────────

interface TelecareMetrics {
  total: number
  completed: number
  missed: number
  cancelled: number
  avgDurationSeconds: number | null
}

function MetricsGrid({ metrics }: { metrics: TelecareMetrics }) {
  const avgDuration = metrics.avgDurationSeconds !== null
    ? formatDuration(Math.round(metrics.avgDurationSeconds))
    : '—'

  const cards = [
    { label: 'Total Sessions', value: String(metrics.total) },
    { label: 'Completed', value: String(metrics.completed) },
    { label: 'Avg Duration', value: avgDuration },
    { label: 'Missed / Cancelled', value: String(metrics.missed + metrics.cancelled) },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl px-4 py-3 flex flex-col gap-1"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProviderTelecarePage() {
  const [sessions, setSessions] = useState<ProviderSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Availability toggle
  const [available, setAvailable] = useState(false)
  const [togglingAvail, setTogglingAvail] = useState(false)

  // Metrics
  const [metrics, setMetrics] = useState<TelecareMetrics | null>(null)

  // Active call state
  const [joining, setJoining] = useState<string | null>(null)
  const [callInfo, setCallInfo] = useState<LiveKitJoinInfo | null>(null)
  const [activeSession, setActiveSession] = useState<ProviderSession | null>(null)
  const [callAudioOnly, setCallAudioOnly] = useState(false)
  const joinStartedAt = useRef<string | null>(null)

  // SOAP notes modal
  const [documentingSession, setDocumentingSession] = useState<ProviderSession | null>(null)

  // Waiting / incoming sessions
  const [waitingSessions, setWaitingSessions] = useState<ProviderSession[]>([])
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)

  // Transfer modal
  const [transferringSession, setTransferringSession] = useState<ProviderSession | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.providerTelecare.sessions()
      setSessions(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Refresh sessions + metrics on focus/visibility and on a 15s interval so
  // status flips (accept, decline, transfer, complete) propagate without
  // the provider clicking Refresh.
  useEffect(() => {
    const refreshAll = () => {
      void load()
      adminApi.providerTelecare.metrics().then(setMetrics).catch(() => null)
    }
    refreshAll()

    let interval: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (interval || document.hidden) return
      interval = setInterval(() => {
        if (!document.hidden) refreshAll()
      }, 15_000)
    }
    const stop = () => {
      if (!interval) return
      clearInterval(interval)
      interval = null
    }
    const onFocus = () => { if (!document.hidden) refreshAll() }
    const onVis = () => {
      if (document.hidden) stop()
      else { refreshAll(); start() }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    start()

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
      stop()
    }
  }, [load])

  // Poll for waiting sessions every 8 seconds (incoming calls — fastest tick).
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await adminApi.providerTelecare.waitingSessions()
        setWaitingSessions(res.data)
      } catch {
        // silent — don't disrupt main page
      }
    }
    poll()
    const interval = setInterval(poll, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleToggleAvailability = useCallback(async () => {
    setTogglingAvail(true)
    try {
      const next = !available
      await adminApi.providerTelecare.setAvailability(next)
      setAvailable(next)
    } catch {
      // silently ignore — the toggle snaps back since we never set state on failure
    } finally {
      setTogglingAvail(false)
    }
  }, [available])

  const handleJoin = useCallback(async (session: ProviderSession, audioOnly: boolean) => {
    setJoining(session.id)
    try {
      const info = await adminApi.providerTelecare.joinToken(session.id)
      joinStartedAt.current = new Date().toISOString()
      await adminApi.providerTelecare.updateStatus(session.id, 'active', {
        startedAt: joinStartedAt.current,
      }).catch(() => null)
      setCallAudioOnly(audioOnly)
      setActiveSession(session)
      setCallInfo(info)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join call')
    } finally {
      setJoining(null)
    }
  }, [])

  const handleLeave = useCallback(async () => {
    if (!activeSession) return
    const endedAt = new Date().toISOString()
    await adminApi.providerTelecare.updateStatus(activeSession.id, 'completed', { endedAt }).catch(() => null)
    const completed = activeSession
    setCallInfo(null)
    setActiveSession(null)
    setCallAudioOnly(false)
    joinStartedAt.current = null
    await load()
    // Prompt to document immediately after call ends
    setDocumentingSession(completed)
  }, [activeSession, load])

  const handleNoteSaved = useCallback((note: SessionNote) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === note.sessionId
          ? { ...s, notes: [note, ...(s.notes ?? [])] }
          : s,
      ),
    )
    setDocumentingSession(null)
  }, [])

  const handleAccept = useCallback(async (session: ProviderSession) => {
    setAcceptingId(session.id)
    try {
      await adminApi.providerTelecare.acceptSession(session.id)
      setWaitingSessions((prev) => prev.filter((s) => s.id !== session.id))
      // Auto-join the call
      await handleJoin(session, false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept session')
    } finally {
      setAcceptingId(null)
    }
  }, [handleJoin])

  const handleDecline = useCallback(async (session: ProviderSession) => {
    setDecliningId(session.id)
    try {
      await adminApi.providerTelecare.declineSession(session.id)
      setWaitingSessions((prev) => prev.filter((s) => s.id !== session.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to decline session')
    } finally {
      setDecliningId(null)
    }
  }, [])

  const handleTransferred = useCallback(async () => {
    const wasTransferred = transferringSession
    setTransferringSession(null)
    // If the transferred session was the one currently in call, leave
    if (wasTransferred && activeSession && wasTransferred.id === activeSession.id) {
      await handleLeave()
    } else {
      await load()
    }
  }, [transferringSession, activeSession, handleLeave, load])

  const upcoming = sessions.filter((s) => s.status === 'scheduled')
  const active = sessions.filter((s) => s.status === 'active' || s.status === 'in_progress')
  const past = sessions.filter((s) => ['completed', 'cancelled', 'missed'].includes(s.status))

  return (
    <>
      {/* ── In-call overlay ──────────────────────────────────────────────────── */}
      {callInfo && activeSession && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0a' }}>
          <div
            className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: '#222', background: '#111' }}
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">
                  {activeSession.patient
                    ? `${activeSession.patient.firstName} ${activeSession.patient.lastName}`
                    : activeSession.hhaRef}
                </p>
                {activeSession.patient?.openemrPatientUuid && (
                  <a
                    href={buildOpenEmrUrl(activeSession.patient.openemrPatientUuid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open patient chart in OpenEMR"
                    className="inline-flex items-center rounded p-0.5 hover:bg-white/10 transition-colors"
                    style={{ color: '#9ca3af' }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <span>{activeSession.hhaRef}</span>
                {activeSession.patient?.dateOfBirth && (
                  <span>· {calcAge(activeSession.patient.dateOfBirth)}</span>
                )}
                {activeSession.patient?.gender && (
                  <span className="capitalize">· {activeSession.patient.gender.toLowerCase()}</span>
                )}
                {activeSession.patient?.subscriptions?.[0]?.plan?.name && (
                  <span>· {activeSession.patient.subscriptions[0].plan.name}</span>
                )}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLeave}
              className="bg-red-600 hover:bg-red-700 border-red-600 text-white"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Leave Call
            </Button>
          </div>

          <div className="flex-1 min-h-0">
            <LiveKitRoom
              token={callInfo.token}
              serverUrl={callInfo.serverUrl}
              connect
              video={!callAudioOnly}
              audio
              onDisconnected={handleLeave}
            >
              <VideoConference />
            </LiveKitRoom>
          </div>
        </div>
      )}

      {/* ── SOAP Notes Modal ─────────────────────────────────────────────────── */}
      {documentingSession && (
        <SoapNotesModal
          session={documentingSession}
          onClose={() => setDocumentingSession(null)}
          onSaved={handleNoteSaved}
        />
      )}

      {/* ── Transfer Modal ───────────────────────────────────────────────────── */}
      {transferringSession && (
        <TransferModal
          session={transferringSession}
          onClose={() => setTransferringSession(null)}
          onTransferred={handleTransferred}
        />
      )}

      {/* ── Main page ────────────────────────────────────────────────────────── */}
      <div className="max-w-[900px]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              My TeleCare Sessions
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Scheduled and active calls with your patients
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Availability toggle */}
            <button
              onClick={handleToggleAvailability}
              disabled={togglingAvail}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60"
              style={
                available
                  ? {
                      background: 'rgba(109,196,63,0.12)',
                      borderColor: '#6DC43F',
                      color: '#6DC43F',
                    }
                  : {
                      background: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-muted)',
                    }
              }
              aria-pressed={available}
              aria-label={available ? 'Go offline' : 'Go online'}
            >
              {togglingAvail ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: available ? '#6DC43F' : 'var(--color-text-faint)' }}
                />
              )}
              {available ? 'Online' : 'Offline'}
            </button>

            <Button variant="secondary" size="sm" onClick={load} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Metrics */}
        {metrics && <MetricsGrid metrics={metrics} />}

        {/* Incoming call banner — shown above session lists */}
        {waitingSessions.length > 0 && (
          <IncomingCallBanner
            sessions={waitingSessions}
            acceptingId={acceptingId}
            decliningId={decliningId}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )}

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBox key={i} height={80} className="rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Active Now
                </h2>
                <div className="space-y-2">
                  {active.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      joining={joining === s.id}
                      onJoin={(audioOnly) => handleJoin(s, audioOnly)}
                      onDocument={() => setDocumentingSession(s)}
                      onTransfer={() => setTransferringSession(s)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Upcoming
              </h2>
              {upcoming.length === 0 ? (
                <Card>
                  <p className="text-center text-sm py-6" style={{ color: 'var(--color-text-faint)' }}>
                    No upcoming sessions
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      joining={joining === s.id}
                      onJoin={(audioOnly) => handleJoin(s, audioOnly)}
                      onDocument={() => setDocumentingSession(s)}
                    />
                  ))}
                </div>
              )}
            </section>

            {past.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Past Sessions
                </h2>
                <div className="space-y-2">
                  {past.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      joining={false}
                      onJoin={(audioOnly) => handleJoin(s, audioOnly)}
                      onDocument={() => setDocumentingSession(s)}
                    />
                  ))}
                </div>
              </section>
            )}

            {sessions.length === 0 && (
              <Card>
                <div className="text-center py-12">
                  <Video className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>No telecare sessions yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>
                    Sessions booked by patients will appear here.
                  </p>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  )
}

'use client'

import { useState } from 'react'
import { useApi } from '@/lib/hooks/useApi'
import { shares, type RecordShare, type CreateShareParams, type ShareAccessMode } from '@/lib/api'
import { ListSkeleton } from '@/components/skeletons/ListSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import {
  Link2,
  Plus,
  Trash2,
  Eye,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Lock,
  Globe,
} from 'lucide-react'

const RECORD_TYPE_LABELS: Record<string, string> = {
  visit: 'Visit Notes',
  prescription: 'Prescriptions',
  lab: 'Lab Results',
  imaging: 'Imaging',
  document: 'Documents',
  referral: 'Referrals',
  expert_review: 'Expert Reviews',
}

const ALL_RECORD_TYPES = Object.keys(RECORD_TYPE_LABELS)

const ACCESS_MODE_META: Record<ShareAccessMode, { icon: React.ReactNode; label: string; desc: string }> = {
  public: {
    icon: <Globe size={14} />,
    label: 'Anyone with link',
    desc: 'No verification required',
  },
  email_list: {
    icon: <Users size={14} />,
    label: 'Specific emails only',
    desc: 'Recipients verify via OTP',
  },
  password: {
    icon: <Lock size={14} />,
    label: 'Password protected',
    desc: 'Requires a shared password',
  },
}

function ShareCard({ share, onRevoke, onAudit }: { share: RecordShare; onRevoke: () => void; onAudit: () => void }) {
  const modeMeta = ACCESS_MODE_META[share.accessMode]
  const isExpired = share.expiresAt ? new Date(share.expiresAt) < new Date() : false

  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{
        background: share.isRevoked || isExpired ? 'var(--color-bg)' : 'var(--color-surface)',
        borderColor: share.isRevoked || isExpired ? 'var(--color-border)' : 'var(--color-border)',
        opacity: share.isRevoked || isExpired ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link2 size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span className="text-sm font-semibold truncate" title={share.label ?? 'Unnamed share'} style={{ color: 'var(--color-text)' }}>
              {share.label ?? 'Unnamed share'}
            </span>
            {share.isRevoked && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
                Revoked
              </span>
            )}
            {isExpired && !share.isRevoked && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                Expired
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {modeMeta.icon}
              {modeMeta.label}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-border)' }}>·</span>
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {share._count.accesses} access event{share._count.accesses !== 1 ? 's' : ''}
            </span>
            {share.expiresAt && !share.isRevoked && (
              <>
                <span className="text-[11px]" style={{ color: 'var(--color-border)' }}>·</span>
                <span className="flex items-center gap-1 text-[11px]" style={{ color: isExpired ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                  <Clock size={10} />
                  {isExpired ? 'Expired' : `Expires ${new Date(share.expiresAt).toLocaleDateString()}`}
                </span>
              </>
            )}
          </div>

          {share.recordTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {share.recordTypes.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                  {RECORD_TYPE_LABELS[t] ?? t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!share.isRevoked && !isExpired && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onAudit}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', cursor: 'pointer' }}
          >
            <Eye size={12} />
            Audit log
          </button>
          <button
            onClick={onRevoke}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', color: 'var(--color-error)', cursor: 'pointer' }}
          >
            <Trash2 size={12} />
            Revoke
          </button>
        </div>
      )}
    </div>
  )
}

function CreateShareWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'details' | 'confirm'>('details')
  const [label, setLabel] = useState('')
  const [allowedEmails, setAllowedEmails] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [expiry, setExpiry] = useState('')
  const [detectForwarding, setDetectForwarding] = useState(false)
  const [notifyRecipients, setNotifyRecipients] = useState(true)
  const [recipientPhones, setRecipientPhones] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [notified, setNotified] = useState<{ emails: number; phones: number } | null>(null)
  const [copiedCreated, setCopiedCreated] = useState(false)

  function toggleType(t: string) {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function goToConfirm() {
    if (!allowedEmails.split(',').map(e => e.trim()).filter(Boolean).length) {
      toast.error('Enter at least one email address')
      return
    }
    setStep('confirm')
  }

  async function handleSubmit() {
    const emails = allowedEmails.split(',').map(e => e.trim()).filter(Boolean)
    if (!emails.length) { toast.error('Enter at least one email address'); return }

    const params: CreateShareParams = {
      label: label.trim() || undefined,
      accessMode: 'email_list',
      allowedEmails: emails,
      recordTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      expiresAt: expiry || undefined,
      detectForwarding,
      notifyRecipients,
    }
    if (notifyRecipients) {
      const phones = recipientPhones.split(',').map(p => p.trim()).filter(Boolean)
      if (phones.length) params.recipientPhones = phones
    }

    setSubmitting(true)
    try {
      const res = await shares.create(params)
      setCreatedToken(res.token)
      setNotified(res.notified ?? null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create share')
    } finally {
      setSubmitting(false)
    }
  }

  const shareUrl = createdToken ? `${window.location.origin}/share/${createdToken}` : ''

  if (createdToken) {
    return (
      <div className="flex flex-col gap-4 p-4 rounded-2xl border" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success)' }}>
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color: 'var(--color-success)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--color-success)' }}>Link created — copy it now</span>
        </div>
        {notified && (notified.emails > 0 || notified.phones > 0) && (
          <p className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
            ✓ Secure link sent to{' '}
            {[
              notified.emails > 0 ? `${notified.emails} email recipient${notified.emails !== 1 ? 's' : ''}` : null,
              notified.phones > 0 ? `${notified.phones} phone number${notified.phones !== 1 ? 's' : ''}` : null,
            ].filter(Boolean).join(' and ')}{' '}
            with access instructions and expiry details.
          </p>
        )}
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          This link will not be shown again. Store it somewhere safe.
        </p>
        <div
          className="rounded-xl px-3 py-2 text-xs font-mono break-all select-all"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        >
          {shareUrl}
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(shareUrl)
              setCopiedCreated(true)
              setTimeout(() => setCopiedCreated(false), 2000)
            }}
          >
            {copiedCreated ? '✓ Copied!' : 'Copy link'}
          </Button>
          <Button variant="secondary" size="sm" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
        {step === 'details' ? 'Access details' : 'Confirm & create'}
      </p>

      {step === 'details' && (
        <div className="flex flex-col gap-3">
          <div
            className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary)' }}
          >
            <Users size={14} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} />
            <p className="text-xs" style={{ color: 'var(--color-text)' }}>
              Recipients must verify their email with a one-time code before they can view any records.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Label (optional)
            </label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. For Dr. Smith referral"
              maxLength={80}
              className="w-full rounded-xl px-3 py-2 text-sm"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Allowed emails <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <textarea
              value={allowedEmails}
              onChange={e => setAllowedEmails(e.target.value)}
              placeholder="doctor@clinic.com, family@example.com"
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm resize-none"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>Separate multiple emails with commas</p>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Record types (leave empty for all)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_RECORD_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: selectedTypes.includes(t) ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: selectedTypes.includes(t) ? '#fff' : 'var(--color-text-muted)',
                    border: `1px solid ${selectedTypes.includes(t) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {RECORD_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Expires on (optional)
            </label>
            <input
              type="datetime-local"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-xl px-3 py-2 text-sm"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={detectForwarding}
              onChange={e => setDetectForwarding(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Detect forwarding</p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Notify me if this link appears to be shared beyond its intended recipients
              </p>
            </div>
          </label>

          <div className="rounded-xl p-3 flex flex-col gap-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyRecipients}
                onChange={e => setNotifyRecipients(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Send the link to recipients automatically</p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  Each allowed email above receives the secure link with access instructions and expiry details.
                </p>
              </div>
            </label>

            {notifyRecipients && (
              <>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Recipient phone numbers for SMS (optional)
                  </label>
                  <input
                    value={recipientPhones}
                    onChange={e => setRecipientPhones(e.target.value)}
                    placeholder="+2348012345678, +2348098765432"
                    className="w-full rounded-xl px-3 py-2 text-sm"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Separate multiple entries with commas. Up to 10 each.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 mt-1">
            <Button variant="primary" size="sm" onClick={goToConfirm}>Review</Button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            <Row label="Access mode" value="Specific emails only (OTP verification)" />
            {label && <Row label="Label" value={label} />}
            <Row label="Allowed emails" value={allowedEmails} />
            <Row label="Record types" value={selectedTypes.length ? selectedTypes.map(t => RECORD_TYPE_LABELS[t]).join(', ') : 'All'} />
            {expiry && <Row label="Expires" value={new Date(expiry).toLocaleString()} />}
            <Row label="Forwarding detection" value={detectForwarding ? 'Enabled' : 'Disabled'} />
            <Row
              label="Auto-delivery"
              value={
                !notifyRecipients
                  ? 'Off — share the link yourself'
                  : ['allowed emails', recipientPhones.trim() ? 'SMS' : null].filter(Boolean).join(' + ')
              }
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setStep('details')}>Back</Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create link'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="text-xs font-semibold text-right max-w-[60%]" style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

function AuditDrawer({ shareId, onClose }: { shareId: string; onClose: () => void }) {
  const { data, isInitialLoad, error } = useApi(() => shares.audit(shareId))

  const ACTION_LABELS: Record<string, string> = {
    viewed: '👁 Viewed',
    otp_sent: '📧 OTP sent',
    otp_failed: '✗ Auth failed',
    otp_verified: '✓ Verified via OTP',
    forward_detected: '⚠ Forwarding detected',
    revoked: '✕ Revoked',
    link_sent: '📤 Link delivered',
  }

  const ACTION_EXPLANATIONS: Record<string, string> = {
    viewed: 'Someone opened and viewed this shared record.',
    otp_sent: 'A one-time verification code was emailed to access this link.',
    otp_failed: 'A verification code was entered incorrectly.',
    otp_verified: 'The recipient successfully verified their identity to view this link.',
    forward_detected: 'This link may have been opened from an unexpected device or location.',
    revoked: 'This share link was manually revoked and no longer works.',
    link_sent: 'The share link was delivered to the recipient.',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="mt-auto rounded-t-3xl p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Access log</p>
          <button onClick={onClose} className="p-2 -m-2" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 20 }} aria-label="Close" title="Close">×</button>
        </div>

        {isInitialLoad && <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
        {error && <p className="text-sm text-center py-4" style={{ color: 'var(--color-error)' }}>{error}</p>}
        {data && data.accesses.length === 0 && (
          <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No access events yet</p>
        )}
        {data?.accesses.map(a => (
          <div key={a.id} className="flex items-start justify-between gap-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <p
                className="text-sm"
                title={ACTION_EXPLANATIONS[a.action] ?? undefined}
                style={{ color: a.action === 'forward_detected' ? 'var(--color-warning)' : 'var(--color-text)' }}
              >
                {ACTION_LABELS[a.action] ?? a.action}
              </p>
              {a.visitorEmail && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{a.visitorEmail}</p>}
            </div>
            <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              {new Date(a.occurredAt).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ShareManageScreen() {
  const { data, isInitialLoad, error, refetch } = useApi(() => shares.list())
  const [showCreate, setShowCreate] = useState(false)
  const [auditShareId, setAuditShareId] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function handleRevoke(id: string) {
    if (!window.confirm('Revoke this share link? Anyone with the link will lose access.')) return
    setRevoking(id)
    try {
      await shares.revoke(id)
      toast.success('Share link revoked')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not revoke')
    } finally {
      setRevoking(null)
    }
  }

  const shareList = Array.isArray(data) ? data : []
  const active = shareList.filter(s => !s.isRevoked && (!s.expiresAt || new Date(s.expiresAt) > new Date()))
  const inactive = shareList.filter(s => s.isRevoked || (s.expiresAt && new Date(s.expiresAt) <= new Date()))
  const [showInactive, setShowInactive] = useState(false)

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            Shared Records
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Control who can view your health records
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(v => !v)}>
          <Plus size={14} />
          {showCreate ? 'Cancel' : 'New link'}
        </Button>
      </div>

      {showCreate && (
        <CreateShareWizard onDone={() => { setShowCreate(false); refetch() }} />
      )}

      <div
        className="flex items-start gap-3 p-3 rounded-xl"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
      >
        <Shield size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} />
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Share links let external parties view specific records. Revoke at any time. All accesses are logged.
        </p>
      </div>

      {isInitialLoad && <ListSkeleton ariaLabel="Loading shares" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!isInitialLoad && active.length === 0 && !showCreate && (
        <div className="text-center py-10">
          <Link2 size={32} className="mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>No active share links</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>Create a link to share records securely</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-3">
          {active.map(s => (
            <ShareCard
              key={s.id}
              share={s}
              onRevoke={() => handleRevoke(s.id)}
              onAudit={() => setAuditShareId(s.id)}
            />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <button
            onClick={() => setShowInactive(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold mb-2"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
          >
            {showInactive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {inactive.length} revoked / expired link{inactive.length !== 1 ? 's' : ''}
          </button>
          {showInactive && (
            <div className="flex flex-col gap-3">
              {inactive.map(s => (
                <ShareCard
                  key={s.id}
                  share={s}
                  onRevoke={() => {}}
                  onAudit={() => setAuditShareId(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {auditShareId && (
        <AuditDrawer shareId={auditShareId} onClose={() => setAuditShareId(null)} />
      )}
    </div>
  )
}

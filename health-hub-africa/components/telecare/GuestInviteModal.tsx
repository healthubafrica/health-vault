'use client'

import { useEffect, useState } from 'react'
import { UserPlus, X, Mail, ShieldCheck, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormInput } from '@/components/ui/FormInput'
import { telecareGuestInvites, TelecareGuestInvite } from '@/lib/api'
import { toast } from 'sonner'

interface GuestInviteModalProps {
  sessionId: string
  onClose: () => void
}

/** Lets a patient invite a caregiver/family member to their scheduled
 * telecare session. The guest never gets an app account — they verify
 * their email with a one-time code at join time (see /telecare-guest/[token]). */
export function GuestInviteModal({ sessionId, onClose }: GuestInviteModalProps) {
  const [invites, setInvites] = useState<TelecareGuestInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => {
    telecareGuestInvites.list(sessionId)
      .then(setInvites)
      .catch(() => setInvites([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [sessionId])

  const handleInvite = async () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      setError('Enter a name and email address')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await telecareGuestInvites.create(sessionId, guestName.trim(), guestEmail.trim())
      toast.success(`Invite sent to ${guestEmail.trim()}`)
      setGuestName('')
      setGuestEmail('')
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send invite')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (inviteId: string) => {
    try {
      await telecareGuestInvites.revoke(sessionId, inviteId)
      toast.success('Invite revoked')
      refresh()
    } catch {
      toast.error('Failed to revoke invite')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <Card className="relative w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            <UserPlus size={18} /> Invite a caregiver or family member
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-[var(--color-bg)]">
            <X size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          They&apos;ll get an email link and must verify it with a one-time code before joining — no
          account needed on their end.
        </p>

        <div className="flex flex-col gap-2 mb-4">
          <FormInput
            label="Guest name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g. Aunty Ngozi"
          />
          <FormInput
            label="Guest email"
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="aunty@example.com"
          />
          {error && <p className="text-xs" style={{ color: 'var(--color-emergency)' }}>{error}</p>}
          <Button onClick={handleInvite} disabled={submitting} className="self-start mt-1">
            {submitting ? 'Sending…' : 'Send invite'}
          </Button>
        </div>

        <div className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Invited guests
          </p>
          {loading ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
          ) : invites.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No guests invited yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-2 rounded-xl" style={{ background: 'var(--color-bg)' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{invite.guestName}</p>
                    <p className="text-xs flex items-center gap-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                      <Mail size={11} /> {invite.guestEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {invite.isRevoked ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                        Revoked
                      </span>
                    ) : invite.verifiedAt ? (
                      <span className="text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: '#EBF5EC', color: '#0E8567' }}>
                        <ShieldCheck size={10} /> Joined
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                        <Clock size={10} /> Pending
                      </span>
                    )}
                    {!invite.isRevoked && (
                      <button
                        onClick={() => handleRevoke(invite.id)}
                        title="Revoke invite"
                        aria-label="Revoke invite"
                        className="p-1 rounded-lg hover:bg-[var(--color-border)]"
                      >
                        <Trash2 size={14} style={{ color: 'var(--color-emergency)' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

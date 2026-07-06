'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { FormTextarea } from '@/components/ui/FormInput'
import { appointments as apptApi, type Appointment } from '@/lib/api'

interface CancelAppointmentModalProps {
  appointment: Appointment | null
  onClose: () => void
  onCancelled: (appt: Appointment) => void
}

const MIN_REASON_LENGTH = 5

export function CancelAppointmentModal({ appointment, onClose, onCancelled }: CancelAppointmentModalProps) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  if (!appointment) return null

  const handleCancel = async () => {
    if (reason.trim().length < MIN_REASON_LENGTH) {
      toast.error("Please tell us why you're cancelling (at least 5 characters)")
      return
    }
    setSaving(true)
    try {
      const updated = await apptApi.cancel(appointment.id, reason.trim())
      toast.success('Appointment cancelled')
      onCancelled(updated)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancellation failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Cancel appointment
          </h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Are you sure you want to cancel this appointment? This cannot be undone.
          </p>
          <FormTextarea
            label="Reason for cancelling"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div
          className="flex justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Keep appointment
          </Button>
          <Button variant="emergency" size="sm" onClick={handleCancel} disabled={saving}>
            {saving ? 'Cancelling…' : 'Cancel appointment'}
          </Button>
        </div>
      </div>
    </div>
  )
}

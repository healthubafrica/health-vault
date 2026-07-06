'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { appointments as apptApi, type Appointment } from '@/lib/api'

interface RescheduleAppointmentModalProps {
  appointment: Appointment | null
  onClose: () => void
  onRescheduled: (appt: Appointment) => void
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function RescheduleAppointmentModal({
  appointment,
  onClose,
  onRescheduled,
}: RescheduleAppointmentModalProps) {
  const [date, setDate] = useState(todayIso())
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [manualDateTime, setManualDateTime] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const hasProvider = !!appointment?.providerId

  // Reset all local state whenever a new appointment is targeted.
  useEffect(() => {
    if (!appointment) return
    setDate(todayIso())
    setSlots([])
    setSelectedSlot('')
    setManualDateTime('')
    setReason('')
  }, [appointment])

  // Slot lookup only applies when the appointment already has an assigned
  // provider — without one there's no specific shift to check against, so
  // the picker falls back to a plain date/time input below.
  useEffect(() => {
    if (!appointment || !hasProvider) return
    setLoadingSlots(true)
    setSelectedSlot('')
    apptApi
      .getSlots({
        serviceType: appointment.serviceType,
        date,
        durationMinutes: appointment.durationMinutes,
        providerId: appointment.providerId!,
        excludeAppointmentId: appointment.id,
      })
      .then((res) => setSlots(res[0]?.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [appointment, hasProvider, date])

  if (!appointment) return null

  const handleReschedule = async () => {
    const scheduledAt = hasProvider
      ? selectedSlot
      : manualDateTime
        ? new Date(manualDateTime).toISOString()
        : ''
    if (!scheduledAt) {
      toast.error(hasProvider ? 'Please select a time slot' : 'Please choose a date and time')
      return
    }
    setSaving(true)
    try {
      const updated = await apptApi.reschedule(appointment.id, {
        scheduledAt,
        reason: reason.trim() || undefined,
      })
      toast.success('Appointment rescheduled')
      onRescheduled(updated)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reschedule failed')
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
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Reschedule appointment
          </h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {hasProvider ? (
            <>
              <FormInput
                label="Date"
                type="date"
                value={date}
                min={todayIso()}
                onChange={(e) => setDate(e.target.value)}
              />
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  Available times
                </label>
                {loadingSlots ? (
                  <div
                    className="h-10 rounded-xl border animate-pulse mt-1"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                ) : slots.length === 0 ? (
                  <p className="text-xs py-2" style={{ color: 'var(--color-text-faint)' }}>
                    No available times on this day. Try another date.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {slots.map((slot) => {
                      const label = new Date(slot).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                      const active = selectedSlot === slot
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors"
                          style={{
                            borderColor: active ? '#6DC43F' : 'var(--color-border)',
                            background: active ? 'var(--color-success-bg)' : 'var(--color-surface)',
                            color: active ? '#006022' : 'var(--color-text)',
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <FormInput
              label="New date & time"
              type="datetime-local"
              value={manualDateTime}
              onChange={(e) => setManualDateTime(e.target.value)}
            />
          )}
          <FormInput label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div
          className="flex justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleReschedule} disabled={saving}>
            {saving ? 'Rescheduling…' : 'Confirm reschedule'}
          </Button>
        </div>
      </div>
    </div>
  )
}

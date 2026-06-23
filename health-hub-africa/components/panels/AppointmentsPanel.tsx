'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { appointments } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { formatDate } from '@/lib/utils'

export function AppointmentsPanel() {
  const router = useRouter()
  const { data: apptRes } = useApi(() => appointments.list({ upcoming: true }))
  const nextAppt = apptRes?.data?.[0]

  function goToBooking(message: string) {
    toast.info(message)
    router.push('/appointments')
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Next Appointment
      </p>

      {nextAppt ? (
        <div className="p-3 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Pill variant="success" className="mb-2">{nextAppt.serviceType}</Pill>
          <p className="text-base font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            {formatDate(nextAppt.scheduledAt)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {new Date(nextAppt.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{nextAppt.provider ? ` · ${nextAppt.provider.title} ${nextAppt.provider.lastName}` : ''}
          </p>
          <Button
            size="sm"
            variant="secondary"
            fullWidth
            className="mt-3"
            onClick={() => goToBooking('Cancel this appointment below, then book a new time')}
          >
            Reschedule
          </Button>
        </div>
      ) : (
        <div className="p-3 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>You have no upcoming appointments scheduled.</p>
        </div>
      )}

      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Care Provider
        </p>
        {nextAppt?.provider ? (
          <div className="flex items-center gap-3">
            <Avatar seed={`${nextAppt.provider.firstName} ${nextAppt.provider.lastName}`} size="md" shape="rounded" alt={`${nextAppt.provider.firstName} ${nextAppt.provider.lastName}`} />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{nextAppt.provider.title} {nextAppt.provider.firstName} {nextAppt.provider.lastName}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{nextAppt.provider.specialty}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>You don&apos;t have an assigned provider yet.</p>
        )}
      </div>

      <Button size="sm" fullWidth onClick={() => goToBooking('Fill in the booking form below')}>
        Book New Appointment
      </Button>
    </div>
  )
}

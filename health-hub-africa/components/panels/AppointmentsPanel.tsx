import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { PATIENT } from '@/lib/data/patient'
import { formatDate } from '@/lib/utils'

export function AppointmentsPanel() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Next Appointment
      </p>

      <div className="p-3 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <Pill variant="success" className="mb-2">{PATIENT.nextAppointment.service}</Pill>
        <p className="text-base font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          {formatDate(PATIENT.nextAppointment.date)}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>10:00 AM · {PATIENT.doctor.name}</p>
        <Button size="sm" variant="secondary" fullWidth className="mt-3">Reschedule</Button>
      </div>

      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Care Provider
        </p>
        <div className="flex items-center gap-3">
          <Avatar seed={PATIENT.doctor.name} size="md" shape="rounded" alt={PATIENT.doctor.name} />
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{PATIENT.doctor.name}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{PATIENT.doctor.specialty} · ★ {PATIENT.doctor.rating}</p>
          </div>
        </div>
      </div>

      <Button size="sm" fullWidth>Book New Appointment</Button>
    </div>
  )
}

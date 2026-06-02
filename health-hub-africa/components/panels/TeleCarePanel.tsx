import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { PATIENT } from '@/lib/data/patient'

export function TeleCarePanel() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Provider Info
      </p>

      <div className="p-3 rounded-xl border flex flex-col gap-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <Avatar seed={PATIENT.doctor.name} size="md" shape="rounded" alt={PATIENT.doctor.name} />
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{PATIENT.doctor.name}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{PATIENT.doctor.specialty}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Availability</span>
          <Pill variant="success">Online Now</Pill>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Last Session</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>May 10, 2026</span>
        </div>
      </div>

      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Last Session Summary
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Medication review for Amlodipine 5mg. BP stable. Patient reports improved sleep. Continue current regimen.
        </p>
      </div>

      <Button size="sm" fullWidth>Schedule Next Session</Button>
    </div>
  )
}

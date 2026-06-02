import { Pill } from '@/components/ui/Pill'
import { IdChip } from '@/components/ui/IdChip'
import { PATIENT } from '@/lib/data/patient'
import { formatDate } from '@/lib/utils'

export function ProfilePanel() {
  const completeness = 88
  const circumference = 2 * Math.PI * 38
  const offset = circumference - (completeness / 100) * circumference

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Profile completeness ring */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Profile Completeness
        </p>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80" aria-label={`Profile ${completeness}% complete`}>
              <circle cx="40" cy="40" r="38" fill="none" stroke="var(--color-border)" strokeWidth="5" />
              <circle
                cx="40" cy="40" r="38" fill="none"
                stroke="#6DC43F" strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                {completeness}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{PATIENT.name}</p>
            <IdChip className="mt-1">{PATIENT.id}</IdChip>
            <Pill variant={PATIENT.status === 'Stable' ? 'success' : 'warning'} className="mt-1.5">{PATIENT.status}</Pill>
          </div>
        </div>
      </div>

      {/* Medical summary */}
      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Medical Summary
        </p>
        {[
          { label: 'Blood Group', value: PATIENT.bloodGroup },
          { label: 'Allergies', value: PATIENT.medical.allergies },
          { label: 'Care Plan', value: PATIENT.medical.carePlan },
          { label: 'Plan', value: `${PATIENT.plan} (Renews ${formatDate(PATIENT.planExpiry)})` },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Active conditions */}
      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Active Conditions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PATIENT.medical.conditions.map(c => (
            <Pill key={c} variant="warning">{c}</Pill>
          ))}
        </div>
      </div>

      {/* Medications */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Current Medications
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PATIENT.medical.medications.map(m => (
            <Pill key={m} variant="success">{m}</Pill>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { Pill } from '@/components/ui/Pill'
import { IdChip } from '@/components/ui/IdChip'
import { patients, subscriptions } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { formatDate } from '@/lib/utils'

export function ProfilePanel() {
  const { data: profileRes } = useApi(() => patients.getMyProfile())
  const { data: subRes } = useApi(() => subscriptions.getMy())

  const profile = profileRes?.data
  const activeSub = subRes?.data

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : ''
  const hhaId = profile?.hhaPatientId ?? ''
  const status = profile?.status ?? 'Active'

  const fieldsCompleted = [
    profile?.bloodGroup,
    profile?.address,
    profile?.gender,
    profile?.dateOfBirth,
    profile?.user?.phone,
    profile?.medicalInfo?.allergies?.length,
    profile?.medicalInfo?.chronicConditions?.length,
    profile?.medicalInfo?.activeMedications?.length,
    profile?.emergencyContacts?.length,
  ].filter(Boolean).length
  const completeness = Math.round((fieldsCompleted / 9) * 100)
  const circumference = 2 * Math.PI * 38
  const offset = circumference - (completeness / 100) * circumference

  const summaryItems = [
    { label: 'Blood Group', value: profile?.bloodGroup || 'Not set' },
    { label: 'Allergies', value: profile?.medicalInfo?.allergies?.join(', ') || 'None recorded' },
    { label: 'Care Plan', value: profile?.medicalInfo?.activeCarePlan || 'No active care plan' },
    { label: 'Plan', value: activeSub ? `${activeSub.plan.name} (Renews ${formatDate(activeSub.expiresAt)})` : 'No subscription' },
  ]

  const conditions = profile?.medicalInfo?.chronicConditions ?? []
  const medications = profile?.medicalInfo?.activeMedications ?? []
  const immunizations = profile?.medicalInfo?.immunizations ?? []

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
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{displayName}</p>
            <IdChip className="mt-1">{hhaId}</IdChip>
            <Pill variant={status === 'Active' ? 'success' : 'warning'} className="mt-1.5">{status}</Pill>
          </div>
        </div>
      </div>

      {/* Medical summary */}
      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Medical Summary
        </p>
        {summaryItems.map(item => (
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
        {conditions.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>None recorded</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {conditions.map(c => (
              <Pill key={c} variant="warning">{c}</Pill>
            ))}
          </div>
        )}
      </div>

      {/* Medications */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Current Medications
        </p>
        {medications.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>None recorded</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {medications.map(m => (
              <Pill key={m} variant="success">{m}</Pill>
            ))}
          </div>
        )}
      </div>

      {/* Immunizations — synced from the clinic's OpenEMR record */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Immunizations
        </p>
        {immunizations.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>None recorded</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {immunizations.map(i => (
              <Pill key={i} variant="info">{i}</Pill>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

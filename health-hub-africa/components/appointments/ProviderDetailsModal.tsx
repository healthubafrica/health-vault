'use client'

import { X, Star, MapPin, Languages, GraduationCap, Award, Stethoscope, HeartPulse, BadgeCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { buildProviderDisplayName } from '@/lib/providerName'
import type { ServiceProvider } from '@/lib/api'

interface ProviderDetailsModalProps {
  provider: ServiceProvider | null
  onClose: () => void
  onChoose?: (id: string) => void
}

function Section({ icon: Icon, title, items }: { icon: React.ElementType; title: string; items?: string[] | null }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={13} style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{title}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>{i}</span>
        ))}
      </div>
    </div>
  )
}

export function ProviderDetailsModal({ provider, onClose, onChoose }: ProviderDetailsModalProps) {
  if (!provider) return null

  const location = [provider.clinicName, provider.clinicCity, provider.clinicState].filter(Boolean).join(', ')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Provider profile</h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }} aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <Avatar seed={`${provider.firstName} ${provider.lastName}`} src={provider.profilePhotoUrl ?? undefined} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{buildProviderDisplayName(provider)}</p>
                <BadgeCheck size={15} style={{ color: '#137333' }} aria-label="Verified provider" />
              </div>
              {provider.specialty && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{provider.specialty}</p>}
              <div className="flex items-center gap-3 mt-1">
                {provider.rating != null && (
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <Star size={12} className="fill-current" style={{ color: '#F5A623' }} />{Number(provider.rating).toFixed(1)}
                  </span>
                )}
                {provider.yearsExperience != null && provider.yearsExperience > 0 && (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{provider.yearsExperience} yrs experience</span>
                )}
                <Pill variant={provider.isAvailable ? 'success' : 'neutral'}>{provider.isAvailable ? 'Available' : 'Unavailable'}</Pill>
              </div>
            </div>
          </div>

          {provider.bio && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{provider.bio}</p>
          )}

          {location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text)' }}>{location}</span>
            </div>
          )}

          <Section icon={Stethoscope} title="Subspecialties" items={provider.subspecialties} />
          <Section icon={HeartPulse} title="Clinical Interests" items={provider.clinicalInterests} />
          <Section icon={GraduationCap} title="Qualifications" items={provider.qualifications} />
          <Section icon={Award} title="Certifications" items={provider.certifications} />
          <Section icon={Award} title="Professional Memberships" items={provider.professionalMemberships} />
          <Section icon={Languages} title="Languages" items={provider.languages} />
          <Section icon={Stethoscope} title="Consultation Services" items={provider.consultationServices} />
        </div>

        {onChoose && (
          <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={() => { onChoose(provider.id); onClose() }} disabled={!provider.isAvailable}>
              Choose this provider
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

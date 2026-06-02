'use client'

import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormTextarea } from '@/components/ui/FormInput'
import { DispatchTimeline } from '@/components/dispatch/DispatchTimeline'
import { MapPin, Phone, Siren, Heart, Bone, Brain, Activity, Baby, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const EMERGENCY_TYPES = [
  { icon: Heart, label: 'Cardiac' },
  { icon: Brain, label: 'Neurological' },
  { icon: Bone, label: 'Trauma' },
  { icon: Activity, label: 'Respiratory' },
  { icon: Baby, label: 'Obstetric' },
  { icon: AlertTriangle, label: 'Other' },
]

export function DispatchScreen() {
  const [selected, setSelected] = useState<string | null>(null)
  const [forSelf, setForSelf] = useState(true)
  const [description, setDescription] = useState('')
  const MAX_CHARS = 200

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            DispatchCare™
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Emergency response coordination
          </p>
        </div>
      </div>

      {/* Emergency strip */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl border"
        style={{ background: 'var(--color-error-bg)', borderColor: 'var(--color-emergency)' }}
        role="alert"
      >
        <div className="w-2 h-2 rounded-full bg-[#C0392B] dot-pulse shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium" style={{ color: 'var(--color-emergency)' }}>
          Dispatch service is active. Response units are on standby.
        </p>
      </div>

      {/* Location */}
      <Card>
        <CardTitle>Your Location</CardTitle>
        <div
          className="flex items-center gap-2 p-3 rounded-xl border"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
        >
          <MapPin size={16} style={{ color: '#6DC43F' }} />
          <span className="text-sm" style={{ color: 'var(--color-text)' }}>Victoria Island, Lagos, Nigeria</span>
          <button className="ml-auto text-xs font-semibold" style={{ color: '#6DC43F' }}>
            Auto-detect
          </button>
        </div>
      </Card>

      {/* Emergency type */}
      <Card>
        <CardTitle>Emergency Type</CardTitle>
        <div className="grid grid-cols-3 gap-2">
          {EMERGENCY_TYPES.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => setSelected(label)}
              aria-pressed={selected === label}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150',
                selected === label
                  ? 'border-[#6DC43F] bg-[var(--color-success-bg)]'
                  : 'border-[var(--color-border)] hover:border-[#6DC43F]/50'
              )}
              style={{ background: selected === label ? 'var(--color-success-bg)' : 'var(--color-surface)' }}
            >
              <Icon
                size={20}
                style={{ color: selected === label ? '#006022' : 'var(--color-text-muted)' }}
              />
              <span
                className="text-[11px] font-semibold"
                style={{ color: selected === label ? '#006022' : 'var(--color-text-muted)' }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Who needs help */}
      <Card>
        <CardTitle>Who needs help?</CardTitle>
        <div className="flex gap-2">
          {['Myself', 'Someone else'].map(opt => (
            <button
              key={opt}
              onClick={() => setForSelf(opt === 'Myself')}
              aria-pressed={forSelf === (opt === 'Myself')}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150',
                (forSelf && opt === 'Myself') || (!forSelf && opt === 'Someone else')
                  ? 'bg-[#6DC43F] text-white border-[#6DC43F]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[#6DC43F]/50'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </Card>

      {/* Description */}
      <Card>
        <FormTextarea
          label="Describe the situation"
          placeholder="Briefly describe the emergency…"
          rows={4}
          value={description}
          onChange={e => setDescription(e.target.value.slice(0, MAX_CHARS))}
          charCount={description.length}
          maxChars={MAX_CHARS}
        />
      </Card>

      {/* Dispatch timeline */}
      <Card>
        <CardTitle>Dispatch Status</CardTitle>
        <DispatchTimeline />
      </Card>

      {/* CTA Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="emergency-outline" size="lg" fullWidth>
          <Phone size={16} /> Call Emergency
        </Button>
        <Button
          variant="emergency"
          size="lg"
          fullWidth
          onClick={() => toast.error('Emergency dispatch activated', {
            description: 'A response unit has been notified. ETA: 8 minutes.',
            duration: 6000,
          })}
        >
          <Siren size={16} /> Dispatch Now
        </Button>
      </div>
    </div>
  )
}

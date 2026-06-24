'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormTextarea } from '@/components/ui/FormInput'
import { DispatchTimeline } from '@/components/dispatch/DispatchTimeline'
import { MapPin, Phone, Siren, Heart, Bone, Brain, Activity, AlertTriangle, Wind, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { dispatch, ApiError, type DispatchCase } from '@/lib/api'

// EmergencyType enum values from backend Prisma schema
const EMERGENCY_TYPES = [
  { value: 'Breathing_Difficulty', label: 'Breathing', icon: Wind },
  { value: 'Chest_Pain',           label: 'Chest Pain', icon: Heart },
  { value: 'Accident_Injury',      label: 'Trauma',     icon: Bone },
  { value: 'Stroke_Symptoms',      label: 'Stroke',     icon: Brain },
  { value: 'Severe_Weakness',      label: 'Weakness',   icon: Activity },
  { value: 'Other',                label: 'Other',      icon: AlertTriangle },
] as const

type EmergencyValue = (typeof EMERGENCY_TYPES)[number]['value']

const STATUS_LABELS: Record<string, string> = {
  requested:          'Requested',
  triaged:            'Triaged',
  unit_assigned:      'Unit Assigned',
  en_route:           'En Route',
  on_scene:           'On Scene',
  patient_stabilised: 'Stabilised',
  transported:        'Transported',
  closed:             'Closed',
}

function formatEmergencyType(value: string): string {
  return value.replace(/_/g, ' ')
}

export function DispatchScreen() {
  const [selectedType, setSelectedType]   = useState<EmergencyValue | null>(null)
  const [forSelf, setForSelf]             = useState(true)
  const [description, setDescription]     = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [coords, setCoords]               = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating]           = useState(false)
  const [dispatching, setDispatching]     = useState(false)
  const [activeCase, setActiveCase]       = useState<DispatchCase | null>(null)
  const [history, setHistory]             = useState<DispatchCase[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const MAX_CHARS = 200

  // Attempt geolocation on mount
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }, [])

  // Load dispatch history on mount
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await dispatch.list()
      const cases = res.data ?? []
      setHistory(cases)
      // Show the most recent non-closed case as the active one
      const active = cases.find(
        (c) => c.status !== 'closed' && c.status !== 'transported'
      )
      if (active) setActiveCase(active)
    } catch {
      // Non-fatal: history just won't be shown
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  async function handleDispatch() {
    if (!selectedType) {
      toast.error('Please select an emergency type')
      return
    }

    try {
      setDispatching(true)
      const result = await dispatch.create({
        emergencyType: selectedType,
        description: description.trim() || undefined,
        locationAddress: locationAddress.trim() || undefined,
        latitude:  coords?.latitude,
        longitude: coords?.longitude,
      })
      setActiveCase(result.data)
      // Prepend to history list
      setHistory((prev) => [result.data, ...prev.filter((c) => c.id !== result.data.id)])
      toast.success('Emergency reported — help is on the way!')
      // Reset form
      setSelectedType(null)
      setDescription('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Dispatch failed — please try again')
    } finally {
      setDispatching(false)
    }
  }

  function handleAutoDetect() {
    if (coords) {
      setLocationAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`)
      toast.success('Location updated from GPS')
      return
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not available on this device')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
        setCoords(c)
        setLocationAddress(`${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`)
        setLocating(false)
        toast.success('Location detected')
      },
      () => {
        setLocating(false)
        toast.error('Could not detect location — please type your address')
      },
      { timeout: 8000 }
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div className="flex items-start gap-3">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
          >
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

      {/* Active case banner */}
      {activeCase && (
        <Card>
          <CardTitle>Active Dispatch</CardTitle>
          <div
            className="flex items-center justify-between p-3 rounded-xl border"
            style={{ background: 'var(--color-error-bg)', borderColor: 'var(--color-emergency)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-emergency)' }}>
                {formatEmergencyType(activeCase.emergencyType)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {STATUS_LABELS[activeCase.status] ?? activeCase.status}
              </p>
            </div>
            <span
              className="text-xs font-bold px-2 py-1 rounded-lg"
              style={{ background: '#C0392B22', color: '#C0392B' }}
            >
              {STATUS_LABELS[activeCase.status] ?? activeCase.status}
            </span>
          </div>
        </Card>
      )}

      {/* Location */}
      <Card>
        <CardTitle>Your Location</CardTitle>
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 p-3 rounded-xl border"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
          >
            <MapPin size={16} style={{ color: '#6DC43F' }} />
            <input
              type="text"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="Enter your address…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--color-text)' }}
              aria-label="Location address"
            />
            <button
              onClick={handleAutoDetect}
              disabled={locating}
              className="text-xs font-semibold shrink-0 disabled:opacity-50"
              style={{ color: '#6DC43F' }}
              type="button"
            >
              {locating ? 'Detecting…' : 'Auto-detect'}
            </button>
          </div>
          {coords && (
            <p className="text-[11px] px-1" style={{ color: 'var(--color-text-muted)' }}>
              GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </p>
          )}
        </div>
      </Card>

      {/* Emergency type */}
      <Card>
        <CardTitle>Emergency Type</CardTitle>
        <div className="grid grid-cols-3 gap-2">
          {EMERGENCY_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSelectedType(value)}
              aria-pressed={selectedType === value}
              type="button"
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150',
                selectedType === value
                  ? 'border-[#6DC43F] bg-[var(--color-success-bg)]'
                  : 'border-[var(--color-border)] hover:border-[#6DC43F]/50'
              )}
              style={{ background: selectedType === value ? 'var(--color-success-bg)' : 'var(--color-surface)' }}
            >
              <Icon
                size={20}
                style={{ color: selectedType === value ? '#006022' : 'var(--color-text-muted)' }}
              />
              <span
                className="text-[11px] font-semibold"
                style={{ color: selectedType === value ? '#006022' : 'var(--color-text-muted)' }}
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
          {['Myself', 'Someone else'].map((opt) => (
            <button
              key={opt}
              onClick={() => setForSelf(opt === 'Myself')}
              aria-pressed={forSelf === (opt === 'Myself')}
              type="button"
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
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_CHARS))}
          charCount={description.length}
          maxChars={MAX_CHARS}
        />
      </Card>

      {/* Dispatch timeline — shows active case events or static placeholder */}
      <Card>
        <CardTitle>Dispatch Status</CardTitle>
        <DispatchTimeline events={activeCase?.events} />
      </Card>

      {/* CTA Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="emergency-outline"
          size="lg"
          fullWidth
          onClick={() => { window.location.href = 'tel:0800442911' }}
        >
          <Phone size={16} /> Call Emergency
        </Button>
        <Button
          variant="emergency"
          size="lg"
          fullWidth
          onClick={handleDispatch}
          disabled={dispatching || !selectedType}
        >
          <Siren size={16} />
          {dispatching ? 'Dispatching…' : 'Dispatch Now'}
        </Button>
      </div>

      {/* Dispatch history */}
      {(history.length > 0 || loadingHistory) && (
        <Card>
          <CardTitle>Recent Dispatches</CardTitle>
          {loadingHistory ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading history…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl border"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {formatEmergencyType(c.emergencyType)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-NG', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-lg shrink-0 ml-2"
                    style={{
                      background: c.status === 'closed' || c.status === 'transported'
                        ? 'var(--color-success-bg)'
                        : 'var(--color-error-bg)',
                      color: c.status === 'closed' || c.status === 'transported'
                        ? '#006022'
                        : '#C0392B',
                    }}
                  >
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

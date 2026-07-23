'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { vitals as vitalsApi, type CreateVitalsPayload } from '@/lib/api'

interface LogVitalsModalProps {
  open: boolean
  onClose: () => void
  onLogged: () => void
}

interface FieldDef {
  key: keyof CreateVitalsPayload
  label: string
  placeholder: string
  min: number
  max: number
  hint: string
}

// Bounds are generous sanity limits (reject typos like 720 bpm), not
// clinical ranges — out-of-range-but-real readings must still be loggable.
// Hints show the normal range so a patient isn't blindsided later when the
// dashboard flags the same reading against these same thresholds.
const FIELDS: FieldDef[] = [
  { key: 'heartRate', label: 'Heart rate (bpm)', placeholder: 'e.g. 72', min: 20, max: 300, hint: 'Normal resting range: 60–100 bpm' },
  { key: 'bloodPressureSystolic', label: 'Systolic BP (mmHg)', placeholder: 'e.g. 120', min: 50, max: 300, hint: 'Normal range: 90–140 mmHg' },
  { key: 'bloodPressureDiastolic', label: 'Diastolic BP (mmHg)', placeholder: 'e.g. 80', min: 30, max: 200, hint: 'Normal range: 60–90 mmHg' },
  { key: 'oxygenSaturation', label: 'SpO₂ (%)', placeholder: 'e.g. 98', min: 50, max: 100, hint: 'Blood oxygen saturation — normal: 95–100%' },
  { key: 'temperatureCelsius', label: 'Temperature (°C)', placeholder: 'e.g. 36.6', min: 30, max: 45, hint: 'Normal body temperature: ~36.1–37.2°C' },
  { key: 'weightKg', label: 'Weight (kg)', placeholder: 'e.g. 70', min: 1, max: 500, hint: 'Ask your provider for a personalized target range' },
  { key: 'bloodGlucose', label: 'Blood glucose (mg/dL)', placeholder: 'e.g. 95', min: 10, max: 1000, hint: 'Normal fasting range: 70–180 mg/dL' },
]

export function LogVitalsModal({ open, onClose, onLogged }: LogVitalsModalProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const setField = (key: string, value: string) =>
    setValues(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    const payload: CreateVitalsPayload = {}
    for (const field of FIELDS) {
      const raw = values[field.key]?.trim()
      if (!raw) continue
      const num = Number(raw)
      if (isNaN(num) || num < field.min || num > field.max) {
        toast.error(`${field.label}: enter a number between ${field.min} and ${field.max}`)
        return
      }
      ;(payload[field.key] as number) = num
    }
    if (Object.keys(payload).length === 0) {
      toast.error('Enter at least one reading')
      return
    }

    setSaving(true)
    try {
      await vitalsApi.create(payload)
      toast.success('Vitals logged')
      setValues({})
      onLogged()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save vitals')
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
        className="relative w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Log vitals
          </h2>
          <button onClick={onClose} className="p-2 -m-2" style={{ color: 'var(--color-text-muted)' }} aria-label="Close" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELDS.map(field => (
            <FormInput
              key={field.key}
              label={field.label}
              hint={field.hint}
              type="number"
              inputMode="decimal"
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
              onChange={(e) => setField(field.key, e.target.value)}
            />
          ))}
        </div>
        <div
          className="flex justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save readings'}
          </Button>
        </div>
      </div>
    </div>
  )
}

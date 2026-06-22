'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type ProviderShift } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { Plus, X, Loader2, CalendarClock } from 'lucide-react'

// Day columns displayed Mon–Sun (ISO 8601 weekday order, work-week first)
// dayOfWeek mapping: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DAY_COLUMNS: { label: string; dayOfWeek: number }[] = [
  { label: 'Mon', dayOfWeek: 1 },
  { label: 'Tue', dayOfWeek: 2 },
  { label: 'Wed', dayOfWeek: 3 },
  { label: 'Thu', dayOfWeek: 4 },
  { label: 'Fri', dayOfWeek: 5 },
  { label: 'Sat', dayOfWeek: 6 },
  { label: 'Sun', dayOfWeek: 0 },
]

function extractHHMM(isoOrTime: string): string {
  // Prisma Time fields come back as ISO strings; extract HH:MM
  if (isoOrTime.includes('T')) {
    return new Date(isoOrTime).toISOString().slice(11, 16)
  }
  // Already "HH:MM" or "HH:MM:SS"
  return isoOrTime.slice(0, 5)
}

// ── Add Shift inline form ─────────────────────────────────────────────────────

function AddShiftForm({
  dayOfWeek,
  onSaved,
  onCancel,
}: {
  dayOfWeek: number
  onSaved: (shift: ProviderShift) => void
  onCancel: () => void
}) {
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!startTime || !endTime) {
      setError('Both start and end time are required.')
      return
    }
    if (endTime <= startTime) {
      setError('End time must be after start time.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const shift = await adminApi.providerTelecare.shifts.create({ dayOfWeek, startTime, endTime })
      onSaved(shift)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save shift')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="mt-2 rounded-xl p-3 space-y-2"
      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
    >
      {error && (
        <p
          className="text-[11px] px-2 py-1 rounded-lg"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          Start
        </label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          End
        </label>
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#6DC43F]/40"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border transition-colors"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 rounded-lg border transition-colors disabled:opacity-60"
          style={{
            background: 'rgba(109,196,63,0.12)',
            borderColor: '#6DC43F',
            color: '#6DC43F',
          }}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Save
        </button>
      </div>
    </div>
  )
}

// ── Day Column ────────────────────────────────────────────────────────────────

function DayColumn({
  label,
  dayOfWeek,
  shifts,
  onDelete,
  onAdded,
}: {
  label: string
  dayOfWeek: number
  shifts: ProviderShift[]
  onDelete: (id: string) => void
  onAdded: (shift: ProviderShift) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Remove this time slot?')
    if (!confirmed) return
    setDeletingId(id)
    try {
      await adminApi.providerTelecare.shifts.delete(id)
      onDelete(id)
    } catch {
      // silently ignore — slot remains visible
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div
      className="flex flex-col rounded-2xl p-3 min-w-0"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Day header */}
      <p
        className="text-xs font-bold text-center pb-2 mb-2 border-b"
        style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
      >
        {label}
      </p>

      {/* Time slot chips */}
      <div className="flex flex-col gap-1.5 flex-1">
        {shifts.length === 0 && !showForm && (
          <p
            className="text-[11px] text-center py-2"
            style={{ color: 'var(--color-text-faint)' }}
          >
            No slots
          </p>
        )}
        {shifts.map((shift) => {
          const start = extractHHMM(shift.startTime)
          const end = extractHHMM(shift.endTime)
          const isDeleting = deletingId === shift.id
          return (
            <div
              key={shift.id}
              className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            >
              <span
                className="text-[11px] font-medium tabular-nums leading-none"
                style={{ color: 'var(--color-text)' }}
              >
                {start}–{end}
              </span>
              <button
                onClick={() => handleDelete(shift.id)}
                disabled={isDeleting}
                className="flex items-center justify-center w-4 h-4 rounded-full transition-colors disabled:opacity-40 hover:bg-[var(--color-border)]"
                aria-label="Remove slot"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {isDeleting
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <X className="w-3 h-3" />
                }
              </button>
            </div>
          )
        })}

        {/* Inline add form */}
        {showForm ? (
          <AddShiftForm
            dayOfWeek={dayOfWeek}
            onSaved={(shift) => {
              onAdded(shift)
              setShowForm(false)
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed text-[11px] font-medium transition-colors hover:bg-[var(--color-bg)]"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProviderShiftsPage() {
  const [shifts, setShifts] = useState<ProviderShift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.providerTelecare.shifts.list()
      setShifts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = useCallback((id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const handleAdded = useCallback((shift: ProviderShift) => {
    setShifts((prev) => [...prev, shift])
  }, [])

  return (
    <div className="max-w-[1000px]">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-5 h-5" style={{ color: '#6DC43F' }} />
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              My Availability
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Set when you&apos;re available for telecare consultations
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} loading={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-7 gap-3">
          {DAY_COLUMNS.map(({ label }) => (
            <SkeletonBox key={label} height={160} className="rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {DAY_COLUMNS.map(({ label, dayOfWeek }) => {
            const dayShifts = shifts
              .filter((s) => s.dayOfWeek === dayOfWeek)
              .sort((a, b) => extractHHMM(a.startTime).localeCompare(extractHHMM(b.startTime)))

            return (
              <DayColumn
                key={dayOfWeek}
                label={label}
                dayOfWeek={dayOfWeek}
                shifts={dayShifts}
                onDelete={handleDelete}
                onAdded={handleAdded}
              />
            )
          })}
        </div>
      )}

      {/* Legend / help text */}
      {!loading && (
        <Card className="mt-6">
          <div className="flex items-start gap-3">
            <CalendarClock
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                How availability works
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Add time slots for each day of the week when you can accept telecare consultations.
                Patients and coordinators will see your availability when scheduling on-demand sessions.
                You can still toggle your real-time online status from the My Sessions page.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Plane,
  Globe,
  CalendarDays,
  FileText,
  ChevronLeft,
  Plus,
  Clock,
  User,
  Pill,
  AlertCircle,
  Heart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { travelsafe, ApiError, type TravelSafeTrip, type TravelSafeSummary } from '@/lib/api'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  preparing: { label: 'Preparing',  color: '#B45309', bg: '#FEF3C7' },
  active:    { label: 'Active',     color: '#006022', bg: 'var(--color-success-bg)' },
  completed: { label: 'Completed',  color: '#1D4ED8', bg: '#EFF6FF' },
  cancelled: { label: 'Cancelled',  color: '#6B7280', bg: 'var(--color-surface)' },
}

const PURPOSE_OPTIONS = ['Business', 'Vacation', 'Medical', 'Education', 'Family', 'Pilgrimage', 'Other']

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: '#6B7280', bg: 'var(--color-surface)' }
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-lg shrink-0"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TravelSafeScreen() {
  const [trips, setTrips]           = useState<TravelSafeTrip[]>([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState<'list' | 'create' | 'detail'>('list')
  const [selected, setSelected]     = useState<TravelSafeTrip | null>(null)
  const [summary, setSummary]       = useState<TravelSafeSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    destinationCountry: '',
    departureDate: '',
    returnDate: '',
    purpose: '',
    partnerCode: '',
    notes: '',
  })

  const loadTrips = useCallback(async () => {
    setLoading(true)
    try {
      const res = await travelsafe.list()
      setTrips(res.data ?? [])
    } catch {
      // non-fatal
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTrips() }, [loadTrips])

  async function handleCreate() {
    if (!form.destinationCountry.trim()) { toast.error('Destination country is required'); return }
    if (!form.departureDate) { toast.error('Departure date is required'); return }
    try {
      setSubmitting(true)
      const res = await travelsafe.create({
        destinationCountry: form.destinationCountry.trim(),
        departureDate: form.departureDate,
        returnDate: form.returnDate || undefined,
        purpose: form.purpose || undefined,
        partnerCode: form.partnerCode.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
      setTrips((prev) => [res.data, ...prev])
      toast.success('TravelSafe trip created!')
      setForm({ destinationCountry: '', departureDate: '', returnDate: '', purpose: '', partnerCode: '', notes: '' })
      setView('list')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create trip')
    } finally {
      setSubmitting(false)
    }
  }

  async function openDetail(trip: TravelSafeTrip) {
    setSelected(trip)
    setView('detail')
    setSummary(null)
    setSummaryLoading(true)
    try {
      const res = await travelsafe.getSummary(trip.id)
      setSummary(res.data)
    } catch {
      // summary is supplementary — don't block the UI
    } finally {
      setSummaryLoading(false)
    }
  }

  const inputCls = cn(
    'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all',
    'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]',
    'focus:border-[#6DC43F] focus:ring-1 focus:ring-[#6DC43F]/20',
  )

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!loading && trips.length === 0 && view === 'list') {
    return (
      <div className="flex flex-col gap-5 pb-20 md:pb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          TravelSafe™
        </h1>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-success-bg)' }}>
            <Plane size={32} style={{ color: '#6DC43F' }} />
          </div>
          <div>
            <p className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>Travel prepared. Health protected.</p>
            <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
              Build your travel health profile, upload documents, and get a portable health summary before departure.
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={() => setView('create')}>
            <Plus size={16} /> Start TravelSafe Prep
          </Button>
        </div>
      </div>
    )
  }

  // ── Create form ─────────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="flex flex-col gap-5 pb-20 md:pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            New Trip
          </h1>
        </div>

        <Card>
          <CardTitle>Trip Details</CardTitle>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Destination Country *</label>
              <input
                className={inputCls}
                placeholder="e.g. United Kingdom"
                value={form.destinationCountry}
                onChange={(e) => setForm((f) => ({ ...f, destinationCountry: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Departure Date *</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.departureDate}
                  onChange={(e) => setForm((f) => ({ ...f, departureDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Return Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.returnDate}
                  onChange={(e) => setForm((f) => ({ ...f, returnDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Purpose</label>
              <select
                className={inputCls}
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              >
                <option value="">Select purpose…</option>
                {PURPOSE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Partner / Booking Code</label>
              <input
                className={inputCls}
                placeholder="e.g. WKN-12345 (optional)"
                value={form.partnerCode}
                onChange={(e) => setForm((f) => ({ ...f, partnerCode: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Notes</label>
              <textarea
                className={cn(inputCls, 'resize-none')}
                rows={3}
                placeholder="Any additional notes…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
        </Card>

        <Button variant="primary" size="lg" fullWidth onClick={handleCreate} disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Trip'}
        </Button>
      </div>
    )
  }

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    const pat = summary?.patient
    return (
      <div className="flex flex-col gap-5 pb-20 md:pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
              {selected.destinationCountry}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={selected.status} />
              {selected.partnerCode && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
                  {selected.partnerCode}
                </span>
              )}
            </div>
          </div>
        </div>

        <Card>
          <CardTitle>Trip Info</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <CalendarDays size={14} style={{ color: '#6DC43F', marginTop: 2, flexShrink: 0 }} />
              <div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Departure</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{formatDate(selected.departureDate)}</p>
              </div>
            </div>
            {selected.returnDate && (
              <div className="flex items-start gap-2">
                <CalendarDays size={14} style={{ color: '#6DC43F', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Return</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{formatDate(selected.returnDate)}</p>
                </div>
              </div>
            )}
            {selected.purpose && (
              <div className="flex items-start gap-2">
                <Globe size={14} style={{ color: '#6DC43F', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Purpose</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{selected.purpose}</p>
                </div>
              </div>
            )}
          </div>
          {selected.notes && (
            <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>{selected.notes}</p>
          )}
        </Card>

        {/* Health summary */}
        {summaryLoading ? (
          <Card>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading health summary…</p>
          </Card>
        ) : pat ? (
          <>
            <Card>
              <CardTitle>Health Profile</CardTitle>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-success-bg)' }}>
                    <User size={16} style={{ color: '#6DC43F' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{pat.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      DOB: {pat.dateOfBirth ? formatDate(pat.dateOfBirth) : '—'}
                      {pat.bloodGroup && ` · Blood Group: ${pat.bloodGroup}`}
                      {pat.genotype && ` · Genotype: ${pat.genotype}`}
                    </p>
                  </div>
                </div>

                {pat.nextOfKin?.name && (
                  <div className="p-3 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>NEXT OF KIN</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{pat.nextOfKin.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {pat.nextOfKin.relationship && `${pat.nextOfKin.relationship} · `}{pat.nextOfKin.phone}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {(pat.allergies.length > 0 || pat.chronicConditions.length > 0 || pat.activeMedications.length > 0) && (
              <Card>
                <CardTitle>Medical Summary</CardTitle>
                <div className="flex flex-col gap-3">
                  {pat.allergies.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AlertCircle size={13} style={{ color: '#C0392B' }} />
                        <span className="text-[11px] font-semibold" style={{ color: '#C0392B' }}>ALLERGIES</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pat.allergies.map((a) => (
                          <span key={a} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: '#FEE2E2', color: '#991B1B' }}>{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {pat.chronicConditions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Heart size={13} style={{ color: '#B45309' }} />
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>CONDITIONS</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pat.chronicConditions.map((c) => (
                          <span key={c} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: '#FEF3C7', color: '#92400E' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {pat.activeMedications.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Pill size={13} style={{ color: '#6DC43F' }} />
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>MEDICATIONS</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pat.activeMedications.map((m) => (
                          <span key={m} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'var(--color-success-bg)', color: '#006022' }}>{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </>
        ) : null}

        <Card>
          <CardTitle>Documents</CardTitle>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Upload travel health documents (vaccination cards, prescriptions, insurance) in your Vault and tag them as <strong>Travel</strong> to include them in this summary.
          </p>
          <div className="mt-3">
            <a href="/vault">
              <Button variant="secondary" size="sm">
                <FileText size={14} /> Open Vault
              </Button>
            </a>
          </div>
        </Card>
      </div>
    )
  }

  // ── Trip list ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            TravelSafe™
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Travel health preparation</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setView('create')}>
          <Plus size={14} /> New Trip
        </Button>
      </div>

      {loading ? (
        <Card>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading trips…</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => openDetail(trip)}
              className="w-full text-left p-4 rounded-2xl border transition-all hover:border-[#6DC43F]/40"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-success-bg)' }}>
                    <Plane size={16} style={{ color: '#6DC43F' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{trip.destinationCountry}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      <Clock size={11} className="inline mr-0.5 -mt-0.5" />
                      {formatDate(trip.departureDate)}{trip.returnDate && ` → ${formatDate(trip.returnDate)}`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={trip.status} />
              </div>
              {trip.partnerCode && (
                <p className="text-[11px] font-mono mt-2 ml-12" style={{ color: 'var(--color-text-muted)' }}>{trip.partnerCode}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

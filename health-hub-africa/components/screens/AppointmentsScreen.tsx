'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardTitle } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormInput'
import { formatDate } from '@/lib/utils'
import { CalendarDays, Search } from 'lucide-react'
import { toast } from 'sonner'
import { appointments as apptApi, providers as providersApi, ApiError, type Appointment, type BookableFacility, type Provider } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { AppointmentsSkeleton } from '@/components/skeletons/AppointmentsSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'

const TABS = ['All', 'Upcoming', 'Completed', 'Cancelled']

const SERVICE_TYPES = [
  { label: 'Health Consult', value: 'HEALTH_CONSULT', appointmentType: 'in_person' },
  { label: 'TeleCare', value: 'TELECARE', appointmentType: 'virtual' },
  { label: 'Care Test', value: 'CARE_TEST', appointmentType: 'in_person' },
  { label: 'Expert Review', value: 'EXPERT_REVIEW', appointmentType: 'in_person' },
  { label: 'MinuteCare', value: 'MINUTE_CARE', appointmentType: 'in_person' },
  { label: 'NeuroFlex', value: 'NEUROFLEX', appointmentType: 'virtual' },
] as const

const STATUS_PILL: Record<string, 'success' | 'warning' | 'neutral' | 'emergency'> = {
  upcoming: 'success',
  completed: 'neutral',
  cancelled: 'emergency',
}

function formatScheduledAt(scheduledAt: string): { date: string; time: string } {
  const dt = new Date(scheduledAt)
  return {
    date: formatDate(scheduledAt),
    time: dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  }
}

export function AppointmentsScreen() {
  const [tab, setTab] = useState('All')
  const searchParams = useSearchParams()

  // Booking form state
  const [serviceType, setServiceType] = useState<string>(SERVICE_TYPES[0].value)
  const [scheduledAt, setScheduledAt] = useState('')
  const [reason, setReason] = useState('')
  const [isBooking, setIsBooking] = useState(false)

  // Facility picker (in-person services only — telecare bookings skip it)
  const [facilities, setFacilities] = useState<BookableFacility[]>([])
  const [facilityId, setFacilityId] = useState<string>('')
  useEffect(() => {
    apptApi.facilities().then(setFacilities).catch(() => setFacilities([]))
  }, [])

  const isInPerson = SERVICE_TYPES.find((s) => s.value === serviceType)?.appointmentType === 'in_person'

  // Provider picker
  const [providerQuery, setProviderQuery] = useState('')
  const [providerResults, setProviderResults] = useState<Provider[]>([])
  const [showProviderDropdown, setShowProviderDropdown] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const providerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const providerDropdownRef = useRef<HTMLDivElement>(null)

  // Pre-select provider from ?providerId= query param
  useEffect(() => {
    const pid = searchParams?.get('providerId')
    if (!pid) return
    providersApi.search('').then(res => {
      const match = res.data?.find(p => p.id === pid)
      if (match) {
        setSelectedProvider(match)
        setProviderQuery(`${match.title ? match.title + ' ' : ''}${match.firstName} ${match.lastName}`)
      }
    }).catch(() => {})
  }, [searchParams])

  useEffect(() => {
    if (providerDebounceRef.current) clearTimeout(providerDebounceRef.current)
    if (!providerQuery.trim()) { setProviderResults([]); setShowProviderDropdown(false); return }
    providerDebounceRef.current = setTimeout(async () => {
      try {
        const res = await providersApi.search(providerQuery.trim())
        setProviderResults(res.data ?? [])
        setShowProviderDropdown(true)
      } catch { setProviderResults([]) }
    }, 300)
    return () => { if (providerDebounceRef.current) clearTimeout(providerDebounceRef.current) }
  }, [providerQuery])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(e.target as Node)) {
        setShowProviderDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cancellation in-progress tracker
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Build list params — pass upcoming:true for the Upcoming tab
  const listParams = tab === 'Upcoming' ? { upcoming: true } : undefined

  const { data: apptRes, isInitialLoad, error, refetch } = useApi(
    () => apptApi.list(listParams),
    [tab],
  )

  if (isInitialLoad) return <AppointmentsSkeleton />
  if (error && !apptRes) return <ErrorState message={error} onRetry={refetch} />

  const allAppointments: Appointment[] = apptRes?.data ?? []

  const filtered = tab === 'All' || tab === 'Upcoming'
    ? allAppointments
    : allAppointments.filter(a => a.status === tab.toLowerCase())

  async function handleCancel(appointment: Appointment) {
    setCancellingId(appointment.id)
    try {
      await apptApi.cancel(appointment.id, 'Patient requested cancellation')
      toast.success('Appointment cancelled')
      refetch()
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : 'Failed to cancel appointment'
      toast.error(message)
    } finally {
      setCancellingId(null)
    }
  }

  async function handleBook() {
    if (!scheduledAt) {
      toast.error('Please select a date and time')
      return
    }
    setIsBooking(true)
    const selected = SERVICE_TYPES.find(s => s.value === serviceType)
    try {
      const willBeInPerson = selected?.appointmentType === 'in_person'
      if (willBeInPerson && !facilityId) {
        toast.error('Please choose a facility for this in-person appointment')
        setIsBooking(false)
        return
      }

      await apptApi.create({
        appointmentType: selected?.appointmentType ?? 'in_person',
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: 30,
        chiefComplaint: reason.trim() || undefined,
        ...(selectedProvider && { providerId: selectedProvider.id }),
        ...(willBeInPerson && facilityId && { facilityId }),
      })
      toast.success('Appointment requested', {
        description: 'Your care team will confirm within 10 hours.',
      })
      setScheduledAt('')
      setReason('')
      refetch()
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : 'Failed to request appointment'
      toast.error(message)
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
          Appointments
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Manage and schedule your care visits
        </p>
      </div>

      <FilterTabs tabs={TABS} active={tab} onChange={setTab} className="self-start" />

      <Card padding="none">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <CalendarDays size={32} style={{ color: 'var(--color-text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No appointments found</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {filtered.map(appt => {
              const providerName = appt.provider
                ? `${appt.provider.title} ${appt.provider.lastName}`
                : 'Provider TBD'
              const { date, time } = formatScheduledAt(appt.scheduledAt)
              const appointmentType = appt.isTelecare ? 'TeleCare' : 'In-person'

              return (
                <div key={appt.id} className="flex items-center gap-3 p-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-success-bg)' }}
                  >
                    <CalendarDays size={16} style={{ color: '#006022' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        {appt.serviceType}
                      </p>
                      <Pill variant={STATUS_PILL[appt.status] ?? 'neutral'}>{appt.status}</Pill>
                      <Pill variant="neutral">{appointmentType}</Pill>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {providerName} · {date} at {time}
                    </p>
                    {appt.reason && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                        {appt.reason}
                      </p>
                    )}
                  </div>
                  {appt.status === 'upcoming' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={cancellingId === appt.id}
                      onClick={() => handleCancel(appt)}
                    >
                      {cancellingId === appt.id ? 'Cancelling…' : 'Cancel'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Book New */}
      <Card>
        <CardTitle>Book New Appointment</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect
            label="Service Type"
            value={serviceType}
            onChange={e => setServiceType(e.target.value)}
          >
            {SERVICE_TYPES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </FormSelect>
          <FormInput
            label="Date &amp; Time"
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
          />

          {/* Facility picker — required for in-person services, hidden for telecare.
              List is OpenEMR-sourced so the appointment routes to a real OpenEMR
              facility id at encounter sync time. */}
          {isInPerson && (
            <div className="sm:col-span-2">
              <FormSelect
                label="Facility"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
              >
                <option value="">
                  {facilities.length === 0 ? 'No facilities available yet' : 'Choose a facility…'}
                </option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.city ? ` — ${f.city}${f.state ? `, ${f.state}` : ''}` : ''}
                  </option>
                ))}
              </FormSelect>
            </div>
          )}

          {/* Provider picker */}
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Care Provider <span className="font-normal">(optional)</span>
            </label>
            <div className="relative" ref={providerDropdownRef}>
              <div className="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                <Search size={13} style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  value={providerQuery}
                  onChange={e => {
                    setProviderQuery(e.target.value)
                    if (!e.target.value.trim()) setSelectedProvider(null)
                  }}
                  placeholder="Search by name or specialty"
                  className="bg-transparent border-none outline-none text-sm w-full"
                  style={{ color: 'var(--color-text)' }}
                />
                {selectedProvider && (
                  <button
                    type="button"
                    onClick={() => { setSelectedProvider(null); setProviderQuery('') }}
                    className="text-xs shrink-0"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {showProviderDropdown && providerResults.length > 0 && (
                <div className="absolute top-11 left-0 right-0 z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden">
                  {providerResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(p)
                        setProviderQuery(`${p.title ? p.title + ' ' : ''}${p.firstName} ${p.lastName}`)
                        setShowProviderDropdown(false)
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                          {p.title ? `${p.title} ` : ''}{p.firstName} {p.lastName}
                        </p>
                        {p.specialty && (
                          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{p.specialty}</p>
                        )}
                      </div>
                      {!p.isAvailable && (
                        <span className="text-[10px] font-medium text-amber-600 shrink-0">Unavailable</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedProvider && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-primary)' }}>
                ✓ Booking with {selectedProvider.title ? `${selectedProvider.title} ` : ''}{selectedProvider.firstName} {selectedProvider.lastName}
              </p>
            )}
          </div>

          <FormTextarea
            label="Reason for Visit"
            rows={3}
            className="sm:col-span-2"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <Button
          className="mt-4"
          disabled={isBooking}
          onClick={handleBook}
        >
          {isBooking ? 'Requesting…' : 'Request Appointment'}
        </Button>
      </Card>
    </div>
  )
}

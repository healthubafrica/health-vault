'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardTitle } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormInput'
import { formatDate } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import {
  appointments as apptApi,
  ApiError,
  type Appointment,
  type BookableFacility,
  type ServiceProvider,
} from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { buildProviderDisplayName } from '@/lib/providerName'
import { useSchedulingPolicy } from '@/lib/hooks/useSchedulingPolicy'
import { AppointmentsSkeleton } from '@/components/skeletons/AppointmentsSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { CancelAppointmentModal } from '@/components/appointments/CancelAppointmentModal'
import { RescheduleAppointmentModal } from '@/components/appointments/RescheduleAppointmentModal'

const RESCHEDULABLE_STATUSES = new Set(['requested', 'confirmed', 'upcoming'])

const TABS = ['All', 'Upcoming', 'Completed', 'Cancelled']

// Values align with the Prisma ServiceType enum so they can be sent directly
// to the API without an extra mapping layer.
const SERVICE_TYPES = [
  { label: 'Health Consult', value: 'HealthConsult', appointmentType: 'in_person' as const },
  { label: 'TeleCare', value: 'TeleCare', appointmentType: 'virtual' as const },
  { label: 'Care Test', value: 'CareTest', appointmentType: 'in_person' as const },
  { label: 'Expert Review', value: 'ExpertReview', appointmentType: 'in_person' as const },
  { label: 'MinuteCare', value: 'MinuteCare', appointmentType: 'in_person' as const },
  { label: 'NeuroFlex', value: 'NeuroFlex', appointmentType: 'virtual' as const },
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

function priorityLabel(priority: number): string {
  if (priority === 1) return 'Primary'
  if (priority === 2) return 'Backup'
  return 'Overflow'
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

  const selectedService = SERVICE_TYPES.find((s) => s.value === serviceType) ?? SERVICE_TYPES[0]
  const isInPerson = selectedService.appointmentType === 'in_person'

  // Service-aware provider picker — reloads when service type or scheduled time changes.
  // Falls back to showing all service providers (no time filter) when scheduledAt is empty.
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const providerFetchRef = useRef<AbortController | null>(null)

  useEffect(() => {
    providerFetchRef.current?.abort()
    const ctrl = new AbortController()
    providerFetchRef.current = ctrl

    setProvidersLoading(true)
    setSelectedProviderId('')
    setServiceProviders([])

    apptApi
      .listProviders(serviceType, scheduledAt || undefined)
      .then((providers) => {
        if (!ctrl.signal.aborted) setServiceProviders(providers ?? [])
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setServiceProviders([])
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setProvidersLoading(false)
      })

    return () => ctrl.abort()
  }, [serviceType, scheduledAt])

  // Pre-select provider from ?providerId= query param
  useEffect(() => {
    const pid = searchParams?.get('providerId')
    if (pid) setSelectedProviderId(pid)
  }, [searchParams])

  // Cancel/reschedule modal targets
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const { policy: schedulingPolicy } = useSchedulingPolicy()

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

  function hoursUntil(appt: Appointment): number {
    return (new Date(appt.scheduledAt).getTime() - Date.now()) / 3_600_000
  }

  async function handleBook() {
    if (!scheduledAt) {
      toast.error('Please select a date and time')
      return
    }
    setIsBooking(true)
    try {
      if (isInPerson && !facilityId) {
        toast.error('Please choose a facility for this in-person appointment')
        return
      }

      await apptApi.create({
        appointmentType: selectedService.appointmentType,
        serviceType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: 30,
        chiefComplaint: reason.trim() || undefined,
        ...(selectedProviderId && { providerId: selectedProviderId }),
        ...(isInPerson && facilityId && { facilityId }),
      })
      toast.success('Appointment requested', {
        description: 'Your care team will confirm shortly.',
      })
      setScheduledAt('')
      setReason('')
      setSelectedProviderId('')
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
              const providerName = appt.provider ? buildProviderDisplayName(appt.provider) : 'Provider TBD'
              const { date, time } = formatScheduledAt(appt.scheduledAt)
              const appointmentType = appt.isTelecare ? 'TeleCare' : 'In-person'
              const canManage = RESCHEDULABLE_STATUSES.has(appt.status)
              const hrsUntil = hoursUntil(appt)
              const selfServiceOff = !schedulingPolicy.selfServiceEnabled
              const cancelBlocked = selfServiceOff || hrsUntil < schedulingPolicy.cancellationWindowHours
              const rescheduleBlocked = selfServiceOff || hrsUntil < schedulingPolicy.rescheduleWindowHours

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
                    {canManage && (cancelBlocked || rescheduleBlocked) && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-emergency)' }}>
                        {selfServiceOff
                          ? 'Self-service scheduling is currently disabled — contact support to make changes.'
                          : `Too close to the appointment time to ${cancelBlocked && rescheduleBlocked ? 'cancel or reschedule' : cancelBlocked ? 'cancel' : 'reschedule'} online.`}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={rescheduleBlocked}
                        onClick={() => setRescheduleTarget(appt)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={cancelBlocked}
                        onClick={() => setCancelTarget(appt)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <CancelAppointmentModal
        appointment={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={() => refetch()}
      />
      <RescheduleAppointmentModal
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onRescheduled={() => refetch()}
      />

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

          {/* Facility picker — required for in-person services, hidden for telecare */}
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

          {/* Service-aware provider picker */}
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Care Provider <span className="font-normal">(optional)</span>
            </label>
            {providersLoading ? (
              <div
                className="h-10 rounded-xl border animate-pulse"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
              />
            ) : serviceProviders.length === 0 ? (
              <p className="text-xs py-2" style={{ color: 'var(--color-text-faint)' }}>
                No providers assigned to this service yet — your care team will be assigned after booking.
              </p>
            ) : (
              <FormSelect
                value={selectedProviderId}
                onChange={e => setSelectedProviderId(e.target.value)}
              >
                <option value="">Let the care team assign a provider</option>
                {serviceProviders.map(p => (
                  <option key={p.id} value={p.id}>
                    {buildProviderDisplayName(p)}
                    {p.specialty ? ` — ${p.specialty}` : ''}
                    {' '}({priorityLabel(p.priority)})
                    {!p.isAvailable ? ' [Unavailable]' : ''}
                  </option>
                ))}
              </FormSelect>
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

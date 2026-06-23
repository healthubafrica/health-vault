'use client'

import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormInput'
import { formatDate } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { appointments as apptApi, ApiError, type Appointment } from '@/lib/api'
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

  // Booking form state
  const [serviceType, setServiceType] = useState<string>(SERVICE_TYPES[0].value)
  const [scheduledAt, setScheduledAt] = useState('')
  const [reason, setReason] = useState('')
  const [isBooking, setIsBooking] = useState(false)

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
      await apptApi.create({
        appointmentType: selected?.appointmentType ?? 'in_person',
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: 30,
        chiefComplaint: reason.trim() || undefined,
      })
      toast.success('Appointment requested', {
        description: 'Your care team will confirm within 24 hours.',
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

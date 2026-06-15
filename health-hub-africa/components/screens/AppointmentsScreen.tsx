'use client'

import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { ListRow } from '@/components/ui/ListRow'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormInput'
import { SERVICES } from '@/lib/data/appointments'
import { formatDate } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { appointments as apptApi } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { AppointmentsSkeleton } from '@/components/skeletons/AppointmentsSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'

const TABS = ['All', 'Upcoming', 'Completed', 'Cancelled']

const STATUS_PILL: Record<string, 'success' | 'warning' | 'neutral' | 'emergency'> = {
  upcoming: 'success',
  completed: 'neutral',
  cancelled: 'emergency',
}

export function AppointmentsScreen() {
  const [tab, setTab] = useState('All')
  const { data: apptRes, isInitialLoad, error, refetch } = useApi(() => apptApi.list())

  if (isInitialLoad) return <AppointmentsSkeleton />
  if (error && !apptRes) return <ErrorState message={error} onRetry={refetch} />

  const allAppointments = (apptRes?.data ?? []).map((a: any) => ({
    id: a.id,
    service: a.serviceType ?? a.service,
    doctor: a.provider ? `${a.provider.title} ${a.provider.lastName}` : a.doctor,
    date: a.scheduledAt ?? a.date,
    time: a.scheduledAt
      ? new Date(a.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : a.time,
    status: a.status,
    type: a.isTelecare ? 'TeleCare' : (a.type ?? 'In-person'),
    reason: a.reason,
  }))

  const filtered = allAppointments.filter((a: any) =>
    tab === 'All' ? true : a.status === tab.toLowerCase()
  )

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
            {filtered.map(appt => (
              <div key={appt.id} className="flex items-center gap-3 p-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-success-bg)' }}
                >
                  <CalendarDays size={16} style={{ color: '#006022' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{appt.service}</p>
                    <Pill variant={STATUS_PILL[appt.status]}>{appt.status}</Pill>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {appt.doctor} · {formatDate(appt.date)} at {appt.time}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{appt.reason}</p>
                </div>
                {appt.status === 'upcoming' && (
                  <Button size="sm" variant="secondary">Reschedule</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Book New */}
      <Card>
        <CardTitle>Book New Appointment</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect label="Service">
            {SERVICES.map(s => <option key={s}>{s}</option>)}
          </FormSelect>
          <FormInput label="Preferred Date" type="date" />
          <FormInput label="Preferred Time" type="time" />
          <FormTextarea label="Reason for Visit" rows={3} className="sm:col-span-2" />
        </div>
        <Button
          className="mt-4"
          onClick={() => toast.success('Appointment requested', {
            description: 'Your care team will confirm within 24 hours.',
          })}
        >
          Request Appointment
        </Button>
      </Card>
    </div>
  )
}

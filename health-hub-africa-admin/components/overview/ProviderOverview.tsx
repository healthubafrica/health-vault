'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi, providerSelf, type ProviderProfile, type ProviderAppointment, type ProviderSession } from '@/lib/api'
import { KpiCard } from '@/components/ui/KpiCard'
import { Card, CardTitle } from '@/components/ui/Card'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { Pill } from '@/components/ui/Pill'
import { formatDateTime } from '@/lib/utils'
import { CalendarCheck, Video, CalendarClock, ShieldCheck, ShieldAlert } from 'lucide-react'

export function ProviderOverview() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [appointments, setAppointments] = useState<ProviderAppointment[]>([])
  const [appointmentsTotal, setAppointmentsTotal] = useState(0)
  const [sessions, setSessions] = useState<ProviderSession[]>([])
  const [shiftCount, setShiftCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, apptRes, sessionsRes, shifts] = await Promise.all([
          providerSelf.getProfile(),
          adminApi.providerAppointments.list({ upcoming: true, limit: 5 }),
          adminApi.providerTelecare.sessions(),
          adminApi.providerTelecare.shifts.list(),
        ])
        setProfile(profileRes.data)
        setAppointments(apptRes.data)
        setAppointmentsTotal(apptRes.meta.total)
        setSessions(sessionsRes.data)
        setShiftCount(shifts.length)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load your overview.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activeSessions = sessions.filter((s) => s.status === 'active' || s.status === 'in_progress').length
  const upcomingSessions = sessions.filter((s) => s.status === 'scheduled').length
  const nextAppointment = appointments[0]
  const displayName = profile ? `${profile.title} ${profile.firstName} ${profile.lastName}`.trim() : ''

  return (
    <div className="max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          {loading ? 'Overview' : `Welcome back, ${displayName}`}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Your appointments, sessions, and availability at a glance
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} height={110} className="rounded-2xl" />
          ))
        ) : (
          <>
            <KpiCard
              label="Verification"
              value={profile?.verifiedAt ? 'Verified' : 'Pending'}
              icon={profile?.verifiedAt ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              pillText={profile?.verifiedAt ? undefined : 'Contact an admin'}
              pillVariant={profile?.verifiedAt ? 'success' : 'warning'}
            />
            <KpiCard
              label="Upcoming Appointments"
              value={appointmentsTotal}
              icon={<CalendarCheck className="w-4 h-4" />}
              subtext={nextAppointment ? `Next: ${formatDateTime(nextAppointment.scheduledAt)}` : undefined}
            />
            <KpiCard
              label="Telecare Sessions"
              value={activeSessions + upcomingSessions}
              icon={<Video className="w-4 h-4" />}
              pillText={activeSessions > 0 ? `${activeSessions} active` : undefined}
              pillVariant={activeSessions > 0 ? 'emergency' : 'success'}
            />
            <KpiCard
              label="Availability Slots"
              value={shiftCount}
              icon={<CalendarClock className="w-4 h-4" />}
              pillText={shiftCount === 0 ? 'Not set up' : undefined}
              pillVariant={shiftCount === 0 ? 'warning' : 'success'}
            />
          </>
        )}
      </div>

      <Card>
        <CardTitle>Upcoming Appointments</CardTitle>
        {loading ? (
          <SkeletonBox height={180} className="rounded-xl" />
        ) : appointments.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
            No upcoming appointments scheduled.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {appointments.map((appt) => (
              <button
                key={appt.id}
                onClick={() => router.push('/provider/appointments')}
                className="w-full flex items-center justify-between gap-3 py-3 text-left hover:opacity-80 transition-opacity"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : 'Patient'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {appt.serviceType} · {formatDateTime(appt.scheduledAt)}
                  </p>
                </div>
                <Pill variant={appt.isTelecare ? 'info' : 'neutral'}>{appt.isTelecare ? 'Virtual' : 'In-person'}</Pill>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

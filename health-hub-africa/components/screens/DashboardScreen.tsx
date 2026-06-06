'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { 
  Heart, 
  Moon, 
  Droplets, 
  Weight, 
  Video, 
  FlaskConical, 
  CalendarPlus, 
  Truck, 
  AlertCircle, 
  Info,
  LayoutGrid,
  List,
  Download,
  Clock,
  Calendar,
  ChevronDown
} from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { ActionChip } from '@/components/ui/ActionChip'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { ListRow } from '@/components/ui/ListRow'
import { IdChip } from '@/components/ui/IdChip'
import { PATIENT } from '@/lib/data/patient'
import { formatDate } from '@/lib/utils'
import { patients, vitals as vitalsApi, appointments, subscriptions } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'

const HeartRateChart = dynamic(() => import('@/components/charts/HeartRateChart').then(m => ({ default: m.HeartRateChart })), { ssr: false })
const SleepChart = dynamic(() => import('@/components/charts/SleepChart').then(m => ({ default: m.SleepChart })), { ssr: false })
const BloodCellsChart = dynamic(() => import('@/components/charts/BloodCellsChart').then(m => ({ default: m.BloodCellsChart })), { ssr: false })
const WeightGauge = dynamic(() => import('@/components/charts/WeightGauge').then(m => ({ default: m.WeightGauge })), { ssr: false })

export function DashboardScreen() {
  const { vitals: mockVitals, doctor, nextAppointment, alerts } = PATIENT

  const { data: profileRes, isInitialLoad: profileLoading, error: profileError, refetch: refetchProfile } = useApi(() => patients.getMyProfile())
  const { data: vitalsRes, isInitialLoad: vitalsLoading } = useApi(() => vitalsApi.list())
  const { data: apptRes, isInitialLoad: apptLoading } = useApi(() => appointments.list({ upcoming: true }))
  const { data: subRes } = useApi(() => subscriptions.getMy())

  if (profileLoading || vitalsLoading || apptLoading) return <DashboardSkeleton />

  if (profileError && !profileRes) {
    return <ErrorState message={profileError} onRetry={refetchProfile} />
  }

  const profile = profileRes?.data
  const latestVitals = vitalsRes?.data?.[0]
  const nextAppt = apptRes?.data?.[0]
  const activeSub = subRes?.data

  const displayName = profile ? profile.firstName : PATIENT.name
  const hhaId = profile?.hhaId ?? PATIENT.id
  const planName = activeSub?.plan?.name ?? PATIENT.plan
  const heartRate = latestVitals?.heartRate ?? mockVitals.heartRate
  const sleepHours = latestVitals?.sleepHours ?? mockVitals.sleep
  const weight = latestVitals?.weightKg ?? mockVitals.weight

  return (
    <div className="flex flex-col gap-6 pb-20 md:pb-5">

      {/* Hello Banner Card */}
      <div
        className="relative overflow-hidden rounded-[24px] p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm"
        style={{ background: 'var(--color-primary-dark)' }}
      >
        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
            Hello, {displayName}! <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-200 mt-1 font-medium">
            What do you need today?
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-3 md:self-center">
          <span className="text-[11px] font-bold text-gray-300 tracking-wider">
            {hhaId}
          </span>
          <span className="px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#bb9f58]/20 text-[#f5dfa3] border border-[#bb9f58]/40 shadow-inner">
            {planName} Plan
          </span>
        </div>
        {/* Decorative subtle background glows */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Health Overview */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">
            Health Overview
          </h2>
          <div className="flex items-center gap-1.5">
            <button className="p-2 rounded-xl bg-[#EBF5EC] text-[#137333] border border-[#137333]/10 cursor-pointer shadow-sm">
              <LayoutGrid size={14} strokeWidth={2.5} />
            </button>
            <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 cursor-pointer">
              <List size={14} strokeWidth={2} />
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold transition-all shadow-sm cursor-pointer uppercase tracking-wider">
              <Download size={13} strokeWidth={2.5} />
              Export
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Card 1: Health Summary */}
          <div className="p-5 rounded-[22px] border border-[var(--color-border)] bg-white shadow-sm flex flex-col gap-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Health Summary
            </p>
            <p className="text-2xl font-extrabold text-[#137333] tracking-tight">
              Stable
            </p>
            <div className="self-start px-2.5 py-1 rounded-full bg-[#EBF5EC] text-[#137333] text-[9px] font-extrabold uppercase tracking-wider border border-[#137333]/15">
              No critical alerts
            </div>
          </div>
          
          {/* Card 2: Next Appointment */}
          <div className="p-5 rounded-[22px] border border-[var(--color-border)] bg-white shadow-sm flex flex-col gap-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Next Appointment
            </p>
            <p className="text-2xl font-extrabold text-gray-800 tracking-tight">
              May 18
            </p>
            <p className="text-[11px] text-gray-400 font-extrabold uppercase tracking-wider">
              MinuteCare™
            </p>
          </div>
          
          {/* Card 3: Active Plan */}
          <div className="p-5 rounded-[22px] border border-[var(--color-border)] bg-white shadow-sm flex flex-col gap-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Active Plan
            </p>
            <p className="text-2xl font-extrabold text-gray-800 tracking-tight">
              Gold
            </p>
            <div className="self-start px-2.5 py-1 rounded-full bg-[#EBF5EC] text-[#137333] text-[9px] font-extrabold uppercase tracking-wider border border-[#137333]/15">
              Active
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tests */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">
          Recent Tests
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Heart rate card */}
          <div className="p-5 rounded-[24px] border border-[var(--color-border)] bg-white shadow-sm flex flex-col justify-between min-h-[190px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Heart rate</span>
              <button className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-gray-400 hover:text-gray-600 border border-[var(--color-border)] rounded-full px-3 py-1 bg-gray-50/50 transition-colors cursor-pointer">
                <Clock size={10} />
                Hourly
                <ChevronDown size={10} />
              </button>
            </div>
            
            <div className="my-2 flex-1 flex items-center">
              <div className="w-full">
                <HeartRateChart />
              </div>
            </div>
            
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-extrabold text-gray-800">{heartRate}</span>
              <span className="text-[10px] font-extrabold text-gray-400 uppercase">bpm</span>
            </div>
          </div>
          
          {/* Sleep card */}
          <div className="p-5 rounded-[24px] border border-[var(--color-border)] bg-white shadow-sm flex flex-col justify-between min-h-[190px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Sleeping periodic</span>
              <button className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-gray-400 hover:text-gray-600 border border-[var(--color-border)] rounded-full px-3 py-1 bg-gray-50/50 transition-colors cursor-pointer">
                <Calendar size={10} />
                Monthly
                <ChevronDown size={10} />
              </button>
            </div>
            
            <div className="my-2 flex-1 flex items-center">
              <div className="w-full">
                <SleepChart />
              </div>
            </div>
            
            <div className="flex items-center mt-1">
              <span className="px-3 py-1 rounded-full bg-[#EBF5EC] text-[#137333] text-[9px] font-extrabold border border-[#137333]/15 uppercase tracking-wider">
                {sleepHours} hours
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">
          Diagnostic Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-[24px]">
            <div className="flex items-center justify-between mb-3">
              <CardTitle className="mb-0 text-xs font-extrabold text-gray-400 uppercase tracking-wider">Blood Cells</CardTitle>
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>12 hrs</span>
            </div>
            <BloodCellsChart />
          </Card>
          <Card className="flex flex-col items-center justify-center rounded-[24px] p-5">
            <CardTitle className="self-start text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Weight Range</CardTitle>
            <WeightGauge
              value={weight}
              min={mockVitals.weightTarget.min}
              max={mockVitals.weightTarget.max}
            />
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="rounded-[24px]">
        <CardTitle className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ActionChip icon={Video} name="TeleCare™" description="Virtual consult" />
          <ActionChip icon={FlaskConical} name="CareTest™" description="Book a lab test" />
          <ActionChip icon={CalendarPlus} name="Appointment" description="Schedule a visit" />
          <ActionChip icon={Truck} name="DispatchCare™" description="Emergency" emergency />
        </div>
      </Card>

      {/* Care Alerts */}
      {alerts.length > 0 && (
        <Card className="rounded-[24px]">
          <CardTitle className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Care Alerts</CardTitle>
          <div className="flex flex-col gap-0">
            {alerts.map((alert) => (
              <ListRow
                key={alert.id}
                title={alert.message}
                subtitle={alert.sub}
                left={
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: alert.type === 'warning' ? 'var(--color-warning-bg)' : '#E3F2FD' }}
                  >
                    {alert.type === 'warning'
                      ? <AlertCircle size={15} style={{ color: 'var(--color-warning)' }} />
                      : <Info size={15} style={{ color: '#1565c0' }} />
                    }
                  </div>
                }
                right={
                  alert.type === 'warning'
                    ? <Pill variant="warning">Action</Pill>
                    : <Pill variant="info">Review</Pill>
                }
              />
            ))}
          </div>
        </Card>
      )}

      {/* Next Appointment + Doctor Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-[24px] p-5">
          <CardTitle className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">Scheduled Care</CardTitle>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Pill variant="success" className="px-3 py-1 font-extrabold text-[9px] uppercase tracking-wider">
                {nextAppt?.serviceType ?? nextAppointment.service}
              </Pill>
              <IdChip>{hhaId}</IdChip>
            </div>
            <p className="text-lg font-extrabold text-gray-800" style={{ fontFamily: 'var(--font-display)' }}>
              {nextAppt ? formatDate(nextAppt.scheduledAt) : formatDate(nextAppointment.date)}
            </p>
            <p className="text-xs font-medium text-gray-400">
              {nextAppt
                ? `With ${nextAppt.provider.title} ${nextAppt.provider.lastName}`
                : `With ${doctor.name}`}
            </p>
            <Button size="sm" variant="secondary" className="self-start mt-1">
              Reschedule
            </Button>
          </div>
        </Card>

        <Card className="rounded-[24px] p-5">
          <CardTitle className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4">Your Doctor</CardTitle>
          <div className="flex items-center gap-3.5">
            <Avatar seed={doctor.name} size="md" shape="circle" alt={doctor.name} />
            <div>
              <p className="text-sm font-extrabold text-gray-800">{doctor.name}</p>
              <p className="text-xs text-gray-400 font-medium">{doctor.specialty}</p>
              <div className="flex gap-3 mt-1.5">
                <span className="text-[10px] font-extrabold text-amber-600">
                  ★ {doctor.rating}
                </span>
                <span className="text-[10px] font-extrabold text-gray-400">
                  {doctor.patients}+ patients
                </span>
                <span className="text-[10px] font-extrabold text-gray-400">
                  {doctor.experience} yrs exp
                </span>
              </div>
            </div>
          </div>
          <Button size="sm" fullWidth className="mt-4">Book Consultation</Button>
        </Card>
      </div>
    </div>
  )
}

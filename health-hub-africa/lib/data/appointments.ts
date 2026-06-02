export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled'

export interface Appointment {
  id: string
  service: string
  doctor: string
  date: string
  time: string
  status: AppointmentStatus
  reason: string
}

export const APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-001',
    service: 'MinuteCare™',
    doctor: 'Dr. Kelechi Asobie',
    date: '2026-05-18',
    time: '10:00 AM',
    status: 'upcoming',
    reason: 'Blood pressure check-up',
  },
  {
    id: 'APT-002',
    service: 'TeleCare™',
    doctor: 'Dr. Kelechi Asobie',
    date: '2026-05-10',
    time: '2:00 PM',
    status: 'completed',
    reason: 'Medication review',
  },
  {
    id: 'APT-003',
    service: 'CareTest™',
    doctor: 'Dr. Amara Nwosu',
    date: '2026-04-28',
    time: '9:00 AM',
    status: 'completed',
    reason: 'Annual lab panel',
  },
  {
    id: 'APT-004',
    service: 'HealthConsult™',
    doctor: 'Dr. Kelechi Asobie',
    date: '2026-04-15',
    time: '11:30 AM',
    status: 'completed',
    reason: 'Care plan review',
  },
]

export const SERVICES = [
  'MinuteCare™',
  'TeleCare™',
  'CareTest™',
  'HealthConsult™',
  'Expert Review™',
  'NeuroFlex™',
]

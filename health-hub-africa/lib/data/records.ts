export type RecordType = 'visit' | 'lab' | 'prescription' | 'document'

export interface ClinicalRecord {
  id: string
  type: RecordType
  title: string
  date: string
  doctor?: string
  description: string
  downloadable: boolean
}

export const RECORDS: ClinicalRecord[] = [
  {
    id: 'REC-001',
    type: 'visit',
    title: 'Outpatient Visit Summary',
    date: '2026-05-10',
    doctor: 'Dr. Kelechi Asobie',
    description: 'Blood pressure monitoring. BP: 138/88 mmHg. Continue current medication.',
    downloadable: true,
  },
  {
    id: 'REC-002',
    type: 'prescription',
    title: 'Amlodipine 5mg — Refill',
    date: '2026-05-10',
    doctor: 'Dr. Kelechi Asobie',
    description: '30-day supply. Take once daily in the morning.',
    downloadable: true,
  },
  {
    id: 'REC-003',
    type: 'lab',
    title: 'Lipid Panel Results',
    date: '2026-04-28',
    doctor: 'Dr. Amara Nwosu',
    description: 'LDL: 148 mg/dL (borderline). Follow-up recommended.',
    downloadable: true,
  },
  {
    id: 'REC-004',
    type: 'lab',
    title: 'Complete Blood Count (CBC)',
    date: '2026-04-28',
    doctor: 'Dr. Amara Nwosu',
    description: 'All values within normal range.',
    downloadable: true,
  },
  {
    id: 'REC-005',
    type: 'document',
    title: 'HHA Care Plan — Q2 2026',
    date: '2026-04-15',
    doctor: 'Dr. Kelechi Asobie',
    description: 'Updated HealthConsult™ care plan with hypertension management goals.',
    downloadable: true,
  },
  {
    id: 'REC-006',
    type: 'visit',
    title: 'TeleCare™ Session Notes',
    date: '2026-03-22',
    doctor: 'Dr. Kelechi Asobie',
    description: 'Remote consultation. Patient reports improved sleep and reduced stress.',
    downloadable: false,
  },
]

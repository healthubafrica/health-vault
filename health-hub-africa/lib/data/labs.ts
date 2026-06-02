export type LabStatus = 'normal' | 'review' | 'critical'

export interface LabResult {
  id: string
  test: string
  date: string
  status: LabStatus
  value?: string
  referenceRange?: string
  note?: string
  downloadable: boolean
}

export const LAB_RESULTS: LabResult[] = [
  {
    id: 'LAB-001',
    test: 'Complete Blood Count (CBC)',
    date: '2026-04-28',
    status: 'normal',
    value: 'All panels normal',
    note: 'WBC: 6.8 × 10³/μL, RBC: 4.7 × 10⁶/μL, Hgb: 14.2 g/dL',
    downloadable: true,
  },
  {
    id: 'LAB-002',
    test: 'Lipid Panel',
    date: '2026-04-28',
    status: 'review',
    value: 'LDL: 148 mg/dL',
    referenceRange: '< 100 mg/dL optimal',
    note: 'Borderline high LDL. Dietary modification advised.',
    downloadable: true,
  },
  {
    id: 'LAB-003',
    test: 'Urinalysis',
    date: '2026-04-28',
    status: 'normal',
    value: 'No abnormalities',
    note: 'Color, clarity, specific gravity, pH all within range.',
    downloadable: true,
  },
  {
    id: 'LAB-004',
    test: 'HbA1c (Glycated Haemoglobin)',
    date: '2026-04-28',
    status: 'normal',
    value: '5.4%',
    referenceRange: '< 5.7% normal',
    note: 'No evidence of pre-diabetes.',
    downloadable: true,
  },
]

export const LAB_CHART_DATA = {
  labels: ['CBC', 'Lipid Panel', 'Urinalysis', 'HbA1c'],
  normal: [4, 2, 5, 4],
  flagged: [0, 3, 0, 0],
}

import type { ProviderSessionStatus } from '@/lib/api'

export const STATUS_PILL: Record<ProviderSessionStatus, 'success' | 'warning' | 'neutral' | 'info' | 'emergency'> = {
  active: 'success',
  in_progress: 'success',
  scheduled: 'info',
  completed: 'neutral',
  cancelled: 'emergency',
  missed: 'warning',
}

export function isJoinable(status: ProviderSessionStatus) {
  return status === 'scheduled' || status === 'active' || status === 'in_progress'
}

export function isTransferable(status: ProviderSessionStatus) {
  return status === 'active' || status === 'in_progress'
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export function calcAge(dob: string | null | undefined): string {
  if (!dob) return '—'
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
  return `${years} yrs`
}

export function buildOpenEmrUrl(uuid: string): string {
  const base = process.env.NEXT_PUBLIC_OPENEMR_URL ?? ''
  return `${base}/interface/patient_file/summary/demographics.php?set_pid=${uuid}`
}

export interface TelecareMetrics {
  total: number
  completed: number
  missed: number
  cancelled: number
  avgDurationSeconds: number | null
}

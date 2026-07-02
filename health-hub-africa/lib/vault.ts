// Shared constants/helpers for the patient document vault.

import type { DocumentCategory } from './api'

// Mirrors the backend DOCUMENT_MIME_TYPES allowlist (documents.constants.ts).
export const VAULT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'text/rtf',
  'image/jpeg',
  'image/png',
  'text/csv',
  'application/xml',
  'text/xml',
  'application/json',
] as const

// For <input type="file" accept=...> — extensions included so pickers on
// platforms with unreliable MIME detection still allow the right files.
export const VAULT_ACCEPT_ATTR = [
  ...VAULT_MIME_TYPES,
  '.pdf', '.doc', '.docx', '.txt', '.rtf', '.jpg', '.jpeg', '.png', '.csv', '.xml', '.json',
].join(',')

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  personal_identification: 'Personal Identification',
  medical_history: 'Medical History',
  providers: 'Providers',
  specialists: 'Specialists',
  emergency: 'Emergency',
  hospital: 'Hospital',
  laboratory: 'Laboratory',
  imaging: 'Imaging',
  medications: 'Medications',
  vaccinations: 'Vaccinations',
  chronic_disease: 'Chronic Disease',
  womens_health: "Women's Health",
  childrens_health: "Children's Health",
  mental_health: 'Mental Health',
  dental: 'Dental',
  vision: 'Vision',
  travel: 'Travel',
  legal: 'Legal',
  wearables: 'Wearables',
  miscellaneous: 'Miscellaneous',
}

export const VAULT_CATEGORIES = Object.keys(CATEGORY_LABELS) as DocumentCategory[]

export function isVaultMimeSupported(mime: string): boolean {
  return (VAULT_MIME_TYPES as readonly string[]).includes(mime)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

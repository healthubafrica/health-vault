// Central API client — all backend calls go through here
// Never import this in Server Components — it reads localStorage for tokens

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

// ── Token helpers ─────────────────────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hha_access_token')
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hha_refresh_token')
}

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem('hha_access_token', access)
  localStorage.setItem('hha_refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('hha_access_token')
  localStorage.removeItem('hha_refresh_token')
}

// ── Core fetch wrapper ────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401 && retry) {
    const refreshed = await attemptTokenRefresh()
    if (refreshed) return request<T>(path, options, false)
    clearTokens()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new ApiError(res.status, body.message ?? 'Request failed')
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-refresh-token': refresh },
    })
    if (!res.ok) return false
    const data = (await res.json()) as { data: { accessToken: string; refreshToken: string } }
    saveTokens(data.data.accessToken, data.data.refreshToken)
    return true
  } catch {
    return false
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface User {
  id: string
  email: string
  role: string
}

export const auth = {
  register: (email: string, password: string, phone?: string) =>
    request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, phone }),
    }),

  login: (email: string, password: string) =>
    request<{ data: AuthTokens & { user: User } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyOtp: (email: string, otp: string, type = 'email') =>
    request<{ data: AuthTokens & { user: User } }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, type }),
    }),

  me: () => request<{ data: User }>('/auth/me'),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),
}

// ── Patients ──────────────────────────────────────────────────────────────

export interface PatientProfile {
  id: string
  hhaId: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  bloodGroup?: string
  address?: string
  city?: string
  state?: string
  country: string
  status: string
  openemrSyncStatus: string
  user: { email: string; phone?: string }
  medicalInfo?: {
    allergies: string[]
    chronicConditions: string[]
    activeMedications: string[]
    activeCarePlan?: string
  }
  emergencyContacts?: Array<{
    fullName: string
    relationship: string
    phone: string
    isPrimary: boolean
  }>
}

export const patients = {
  getMyProfile: () => request<{ data: PatientProfile }>('/patients/me'),

  create: (data: Record<string, unknown>) =>
    request<{ data: PatientProfile }>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    request<{ data: PatientProfile }>(`/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// ── Vitals ────────────────────────────────────────────────────────────────

export interface VitalsReading {
  id: string
  recordedAt: string
  heartRate?: number
  systolicBp?: number
  diastolicBp?: number
  spo2?: number
  weightKg?: number
  heightCm?: number
  temperatureC?: number
  bloodGlucose?: number
  hba1c?: number
  haemoglobin?: number
  sleepHours?: number
}

export const vitals = {
  list: (patientId?: string) =>
    request<{ data: VitalsReading[] }>(`/vitals${patientId ? `?patientId=${patientId}` : ''}`),

  create: (data: Partial<VitalsReading>) =>
    request<{ data: VitalsReading }>('/vitals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ── Appointments ──────────────────────────────────────────────────────────

export interface Appointment {
  id: string
  hhaRef: string
  serviceType: string
  status: string
  scheduledAt: string
  durationMinutes: number
  reason?: string
  isTelecare: boolean
  meetingUrl?: string
  provider: { firstName: string; lastName: string; specialty: string; title: string }
}

export const appointments = {
  list: (params?: { status?: string; upcoming?: boolean }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<{ data: Appointment[]; meta: { total: number } }>(`/appointments${qs}`)
  },

  get: (id: string) => request<{ data: Appointment }>(`/appointments/${id}`),

  create: (data: Record<string, unknown>) =>
    request<{ data: Appointment }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancel: (id: string, note?: string) =>
    request<{ data: Appointment }>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled', cancellationNote: note }),
    }),
}

// ── Clinical Records ──────────────────────────────────────────────────────

export interface ClinicalRecord {
  id: string
  hhaRef: string
  recordType: string
  title: string
  description?: string
  fileUrl?: string
  fileMimeType?: string
  isDownloadable: boolean
  recordedAt: string
  provider?: { firstName: string; lastName: string; title: string }
}

export const records = {
  list: (params?: { type?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<{ data: ClinicalRecord[]; meta: { total: number } }>(`/records${qs}`)
  },

  get: (id: string) => request<{ data: ClinicalRecord }>(`/records/${id}`),

  getUploadUrl: (filename: string, mimeType: string) =>
    request<{ data: { uploadUrl: string; fileUrl: string } }>('/records/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, mimeType }),
    }),
}

// ── Lab Orders & Results ──────────────────────────────────────────────────

export interface LabOrder {
  id: string
  hhaRef: string
  orderedAt: string
  overallStatus: string
  labFacility?: string
  results: Array<{
    id: string
    testName: string
    status: string
    valueDisplay?: string
    unit?: string
    referenceRange?: string
    isFlagged: boolean
  }>
  provider: { firstName: string; lastName: string; title: string }
}

export const labs = {
  listOrders: () => request<{ data: LabOrder[] }>('/labs/orders'),

  getOrder: (id: string) => request<{ data: LabOrder }>(`/labs/orders/${id}`),
}

// ── Payments ──────────────────────────────────────────────────────────────

export interface Payment {
  id: string
  hhaRef: string
  amountKobo: number
  currency: string
  status: string
  gateway: string
  description: string
  paidAt?: string
  createdAt: string
}

export const payments = {
  list: () => request<{ data: Payment[] }>('/payments'),

  get: (id: string) => request<{ data: Payment }>(`/payments/${id}`),

  initiate: (data: { gateway: string; purpose: string; amountKobo: number; currency: string }) =>
    request<{ paymentId: string; authorizationUrl: string; gateway: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ── Subscriptions ─────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string
  slug: string
  tier: string
  name: string
  priceKobo: number
  billingPeriod: string
  features: string[]
}

export interface ActiveSubscription {
  id: string
  status: string
  startedAt: string
  expiresAt: string
  autoRenew: boolean
  plan: SubscriptionPlan
}

export const subscriptions = {
  listPlans: () => request<{ data: SubscriptionPlan[] }>('/subscriptions/plans'),

  getMy: () => request<{ data: ActiveSubscription | null }>('/subscriptions/my'),

  subscribe: (planId: string, gateway: string) =>
    request<{ paymentId: string; authorizationUrl: string }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planId, gateway }),
    }),
}

// ── Notifications preferences ─────────────────────────────────────────────

export const notificationPrefs = {
  get: () => request<{ data: Record<string, boolean> }>('/auth/notification-preferences'),

  update: (prefs: Record<string, boolean>) =>
    request<{ data: Record<string, boolean> }>('/auth/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }),
}

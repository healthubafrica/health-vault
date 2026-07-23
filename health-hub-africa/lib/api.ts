// Central API client — all backend data calls go through here with a
// short-lived access token attached as Authorization: Bearer.
//
// Session cookies are issued by the same-origin Next.js /api/auth/* route
// handlers (app/api/auth/*). The refresh token (hha_rt) is HttpOnly, so an
// injected script cannot read the long-lived credential; only the /api/auth
// route handlers can. The access token (hha_at) is readable here solely so we
// can attach it as a Bearer header, and it expires in 15 minutes.

import {
  friendlyApiError,
  friendlyNetworkError,
  friendlySessionExpired,
} from './errorMessages'

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

const ACCESS_COOKIE = 'hha_at'   // access token — set by /api/auth/*, readable by JS

// ── Cookie helpers ────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Strict`
}

// Clears the JS-readable access token. hha_rt is HttpOnly and is cleared
// server-side by the /api/auth/logout and /api/auth/refresh route handlers.
export function clearTokens() {
  deleteCookie(ACCESS_COOKIE)
}

// ── BFF helper for same-origin /api/auth/* route handlers ──────────────────

async function bffFetch<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new ApiError(0, friendlyNetworkError())
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, friendlyApiError(res.status, (data as { message?: string }).message))
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Core fetch wrapper ────────────────────────────────────────────────────

// GET requests are deduplicated: many components mount at once and request
// the same endpoint (e.g. /patients/me), which without this can fan out
// into dozens of identical requests and trip the API's rate limiter (429).
// Concurrent callers for the same path share one in-flight request, and the
// result is cached briefly so staggered mounts don't refire either.
const GET_CACHE_TTL_MS = 3000
const inflightGetRequests = new Map<string, Promise<unknown>>()
const recentGetResults = new Map<string, { data: unknown; expiresAt: number }>()

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const isGet = !options.method || options.method === 'GET'

  if (isGet) {
    const cached = recentGetResults.get(path)
    if (cached && cached.expiresAt > Date.now()) return cached.data as T

    const inflight = inflightGetRequests.get(path)
    if (inflight) return inflight as Promise<T>
  }

  const doRequest = async (): Promise<T> => {
    const token = getCookie(ACCESS_COOKIE)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    let res: Response
    try {
      res = await fetch(`${BASE}${path}`, { ...options, headers })
    } catch {
      // Network / DNS / CORS preflight failure — fetch only throws here when
      // the request never reached a response. Translate to friendly copy.
      throw new ApiError(0, friendlyNetworkError())
    }

    if (res.status === 401 && retry) {
      const refreshed = await attemptTokenRefresh()
      if (refreshed) return request<T>(path, options, false)
      clearTokens()
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new ApiError(401, friendlySessionExpired())
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(res.status, friendlyApiError(res.status, body.message))
    }

    if (res.status === 204) return undefined as T

    return res.json() as Promise<T>
  }

  if (!isGet) {
    // Mutations invalidate any cached GET results so subsequent reads are fresh.
    recentGetResults.clear()
    return doRequest()
  }

  const promise = doRequest()
    .then((data) => {
      recentGetResults.set(path, { data, expiresAt: Date.now() + GET_CACHE_TTL_MS })
      return data
    })
    .finally(() => {
      inflightGetRequests.delete(path)
    })

  inflightGetRequests.set(path, promise)
  return promise
}

async function attemptTokenRefresh(): Promise<boolean> {
  // The HttpOnly refresh cookie is sent automatically to the route handler,
  // which rotates both cookies server-side.
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' })
    return res.ok
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

export interface Session {
  id: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
  expiresAt: string
}

export interface NotificationPrefs {
  emailEnabled: boolean
  smsEnabled: boolean
  pushEnabled: boolean
  whatsappEnabled: boolean
  appointmentReminders: boolean
  labResultAlerts: boolean
  paymentReceipts: boolean
  dispatchUpdates: boolean
  expertReviewUpdates: boolean
  marketingComms: boolean
}

export const auth = {
  register: (email: string, password: string, phoneNumber?: string, fullName?: string) =>
    request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, phoneNumber, fullName }),
    }),

  // login/verifyOtp go through the same-origin BFF so the HttpOnly refresh
  // cookie is set server-side and never touches JS.
  login: (email: string, password: string) =>
    bffFetch<{ accessToken: string } | { requiresTwoFactor: true; userId: string }>(
      '/api/auth/login',
      { email, password },
    ),

  verifyOtp: (email: string, otp: string, type = 'email') =>
    bffFetch<{ accessToken: string }>('/api/auth/verify-otp', { email, otp, type }),

  requestSmsOtp: (email: string, phone?: string) =>
    request<{ message: string }>('/auth/request-sms-otp', {
      method: 'POST',
      body: JSON.stringify({ email, phone }),
    }),

  me: () => request<{ data: User }>('/auth/me'),

  logout: () => bffFetch<void>('/api/auth/logout'),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getSessions: () => request<{ data: Session[] }>('/auth/sessions'),

  revokeSession: (sessionId: string) =>
    request<{ message: string }>(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),

  logoutAll: () =>
    request<{ message: string }>('/auth/logout-all', { method: 'POST' }),

  get2faStatus: () => request<{ twoFactorEnabled: boolean }>('/auth/2fa'),

  toggle2fa: (enabled: boolean) =>
    request<{ twoFactorEnabled: boolean; message: string }>('/auth/2fa', {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
}

// ── Patients ──────────────────────────────────────────────────────────────

export interface PatientProfile {
  id: string
  hhaPatientId: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  profilePhotoUrl?: string
  bloodGroup?: string
  address?: string
  city?: string
  state?: string
  country: string
  nin?: string
  status: string
  openemrSyncStatus: string
  preferredLanguage?: string
  dateFormat?: string
  user: { email: string; phone?: string }
  medicalInfo?: {
    allergies: string[]
    chronicConditions: string[]
    activeMedications: string[]
    immunizations?: string[]
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

  getProfilePhotoUploadUrl: (data: { contentType: string; sizeBytes: number }) =>
    request<{ uploadUrl: string; objectKey: string; publicUrl: string }>('/patients/me/profile-photo-upload-url', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  requestExport: () =>
    request<{ message: string }>('/patients/me/request-export', { method: 'POST' }),

  selfDeactivate: (password: string) =>
    request<{ message: string }>('/patients/me/deactivate', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
}

// ── Notification preferences ──────────────────────────────────────────────

export const notificationPrefs = {
  get: () => request<{ data: NotificationPrefs }>('/auth/notification-preferences'),

  update: (prefs: Partial<NotificationPrefs>) =>
    request<{ data: NotificationPrefs }>('/auth/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
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
  wbc?: number
  rbc?: number
  sleepHours?: number
}

// The create endpoint's field names differ from the stored reading shape
// (bloodPressureSystolic → systolicBp etc.) — sending VitalsReading keys
// would be silently stripped by the API's validation and store an empty row.
export interface CreateVitalsPayload {
  recordedAt?: string
  heartRate?: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  oxygenSaturation?: number
  temperatureCelsius?: number
  weightKg?: number
  heightCm?: number
  bloodGlucose?: number
  bloodGlucoseContext?: string
  notes?: string
}

export const vitals = {
  list: (patientId?: string) =>
    request<{ data: VitalsReading[] }>(`/vitals${patientId ? `?patientId=${patientId}` : ''}`),

  create: (data: CreateVitalsPayload) =>
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
  providerId?: string | null
  provider?: { firstName: string; lastName: string; specialty: string; title: string } | null
}

export interface BookableFacility {
  id: string
  name: string
  city?: string | null
  state?: string | null
}

export interface ServiceProvider {
  id: string
  firstName: string
  lastName: string
  title?: string
  specialty?: string
  rating?: number
  isAvailable: boolean
  priority: number
  // Professional profile shown to patients when choosing a provider.
  profilePhotoUrl?: string | null
  bio?: string | null
  yearsExperience?: number
  subspecialties?: string[]
  qualifications?: string[]
  certifications?: string[]
  professionalMemberships?: string[]
  languages?: string[]
  clinicalInterests?: string[]
  consultationServices?: string[]
  clinicName?: string | null
  clinicCity?: string | null
  clinicState?: string | null
}

export interface CreateAppointmentPayload {
  appointmentType: 'in_person' | 'virtual' | 'home_visit'
  serviceType?: string
  scheduledAt: string
  durationMinutes: number
  chiefComplaint?: string
  notes?: string
  providerId?: string
  facilityId?: string
  patientId?: string
}

export const appointments = {
  list: (params?: { status?: string; upcoming?: boolean }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<{ data: Appointment[]; meta: { total: number } }>(`/appointments${qs}`)
  },

  get: (id: string) => request<{ data: Appointment }>(`/appointments/${id}`),

  // Facilities mirrored from OpenEMR — used to populate the picker on the
  // booking screen for in-person appointment types. Telecare bookings skip
  // this and don't send a facilityId.
  facilities: () => request<BookableFacility[]>('/appointments/facilities'),

  // Returns providers assigned to the given service type, ordered by priority.
  // Pass scheduledAt to further restrict to providers whose shift covers that time.
  listProviders: (serviceType: string, scheduledAt?: string) => {
    const params = new URLSearchParams({ serviceType })
    if (scheduledAt) params.set('scheduledAt', scheduledAt)
    return request<ServiceProvider[]>(`/appointments/providers?${params}`)
  },

  create: (data: CreateAppointmentPayload) =>
    request<{ data: Appointment }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Cancels via the dedicated cancel endpoint — body takes {reason}, not {cancellationNote}.
  // Backend returns the appointment unwrapped (not {data: ...}) — unlike
  // get/create above, which are wrapped. Typed correctly here.
  cancel: (id: string, reason?: string) =>
    request<Appointment>(`/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? '' }),
    }),

  // Real-time available slots for a service type on a given day. Pass
  // excludeAppointmentId when rescheduling so the appointment's own current
  // slot isn't excluded from itself by the conflict check.
  getSlots: (params: {
    serviceType: string
    date: string
    durationMinutes?: number
    providerId?: string
    excludeAppointmentId?: string
  }) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) qs.set(key, String(value))
    })
    return request<Array<{ providerId: string; providerName: string; slots: string[]; hasScheduleConfigured: boolean }>>(
      `/appointments/slots?${qs}`,
    )
  },

  reschedule: (id: string, data: { scheduledAt: string; durationMinutes?: number; reason?: string }) =>
    request<Appointment>(`/appointments/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSchedulingPolicy: () =>
    request<{ cancellationWindowHours: number; rescheduleWindowHours: number; selfServiceEnabled: boolean }>(
      '/appointments/scheduling-policy',
    ),
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
    const qs = params?.type ? `?type=${encodeURIComponent(params.type)}` : ''
    return request<{ data: ClinicalRecord[]; meta: { total: number } }>(`/records${qs}`)
  },

  get: (id: string) => request<{ data: ClinicalRecord }>(`/records/${id}`),

  // DEAD CODE — field names and response shape don't match the backend
  // (expects { filename, contentType, sizeBytes }, returns { uploadUrl, objectKey }
  // unwrapped). Kept only to avoid breaking imports; use `documents.getUploadUrl`
  // for vault uploads instead. TODO: remove once confirmed unused.
  getUploadUrl: (filename: string, mimeType: string) =>
    request<{ data: { uploadUrl: string; fileUrl: string } }>('/records/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, mimeType }),
    }),

  getDownloadUrl: (objectKey: string) =>
    request<{ data: { downloadUrl: string } }>(`/records/download-url/${encodeURIComponent(objectKey)}`),

  getStorageUsage: () =>
    request<{ data: StorageUsage | null }>('/records/storage'),

  // Structured prescription rows (dosage, frequency, refills, expiry) behind
  // the recordType=prescription clinical records. Returns a bare array —
  // this endpoint has no { data } envelope.
  prescriptions: () => request<PrescriptionItem[]>('/records/prescriptions/list'),
}

export interface PrescriptionItem {
  id: string
  drugName: string
  dosage: string
  frequency: string
  route: string
  refillsRemaining: number
  expiresAt?: string | null
  notes?: string | null
  createdAt: string
  record?: { id: string; hhaRef: string; recordedAt: string; title: string } | null
}

export interface StorageUsage {
  usedBytes: number
  quotaBytes: number | null
  fileCount: number
  maxFiles: number | null
  maxFileSizeBytes: number | null
}

// ── Vault Documents (patient uploads) ─────────────────────────────────────

export type DocumentCategory =
  | 'personal_identification'
  | 'medical_history'
  | 'providers'
  | 'specialists'
  | 'emergency'
  | 'hospital'
  | 'laboratory'
  | 'imaging'
  | 'medications'
  | 'vaccinations'
  | 'chronic_disease'
  | 'womens_health'
  | 'childrens_health'
  | 'mental_health'
  | 'dental'
  | 'vision'
  | 'travel'
  | 'legal'
  | 'wearables'
  | 'miscellaneous'

export interface VaultDocument {
  id: string
  hhaRef: string
  recordType: string
  title: string
  description?: string | null
  category: DocumentCategory | null
  tags: string[]
  originalFileName?: string | null
  source: string
  fileUrl?: string | null
  fileMimeType?: string | null
  fileSizeBytes?: number | null
  providerVisibility: boolean
  recordedAt: string
  createdAt: string
  updatedAt: string
}

export interface DocumentListParams {
  q?: string
  category?: DocumentCategory
  sort?: 'title' | 'createdAt' | 'fileSizeBytes'
  order?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface DocumentUploadTicket {
  uploadUrl: string
  objectKey: string
  expiresIn: number
}

export const documents = {
  getUploadUrl: (data: { fileName: string; contentType: string; sizeBytes: number }) =>
    request<{ data: DocumentUploadTicket }>('/documents/upload-url', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  create: (data: {
    objectKey: string
    fileName: string
    title?: string
    category: DocumentCategory
    tags?: string[]
    description?: string
    documentDate?: string
  }) =>
    request<{ data: VaultDocument }>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (params?: DocumentListParams) => {
    const qs = new URLSearchParams()
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') qs.set(key, String(value))
    })
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return request<{ data: VaultDocument[]; meta: { total: number; page: number; pageSize: number } }>(
      `/documents${suffix}`,
    )
  },

  get: (id: string) => request<{ data: VaultDocument }>(`/documents/${id}`),

  update: (
    id: string,
    data: Partial<{
      title: string
      description: string
      category: DocumentCategory
      tags: string[]
      documentDate: string
      providerVisibility: boolean
    }>,
  ) =>
    request<{ data: VaultDocument }>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getReplaceUrl: (id: string, data: { fileName: string; contentType: string; sizeBytes: number }) =>
    request<{ data: DocumentUploadTicket }>(`/documents/${id}/replace-url`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  replace: (id: string, data: { objectKey: string; fileName: string }) =>
    request<{ data: VaultDocument }>(`/documents/${id}/replace`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  remove: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
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

export interface GatewayStatus {
  gateway: string
  name: string
  active: boolean
  bankName?: string
  accountNumber?: string
  accountName?: string
}

export const payments = {
  list: () => request<{ data: Payment[] }>('/payments'),

  get: (id: string) => request<{ data: Payment }>(`/payments/${id}`),

  initiate: (data: { gateway: string; purpose: string; amountKobo: number; currency: string; description?: string }) =>
    request<{ paymentId: string; authorizationUrl?: string; gateway: string; status?: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getGatewayStatus: () => request<GatewayStatus[]>('/payments/gateways/status'),

  verify: (reference: string) =>
    request<{ status: string; paymentId: string; gateway: string }>(`/payments/verify?reference=${encodeURIComponent(reference)}`),

  // Fetches the printable HTML receipt as text (not JSON) so it can be opened
  // in a new window — a plain `<a>`/window.open navigation to the endpoint
  // directly wouldn't carry the Authorization header, since the access token
  // lives in a cookie this app attaches manually, not one the browser sends
  // automatically cross-navigation.
  getReceiptHtml: async (id: string): Promise<string> => {
    const token = getCookie(ACCESS_COOKIE)
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    let res: Response
    try {
      res = await fetch(`${BASE}/payments/${id}/receipt`, { headers })
    } catch {
      throw new ApiError(0, friendlyNetworkError())
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(res.status, friendlyApiError(res.status, body.message))
    }
    return res.text()
  },
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
  annualPriceKobo?: number
  launchPriceKobo?: number
  isMostPopular?: boolean
  isBestValue?: boolean
  bestFor?: string
  noClaimPct?: number
}

export interface ActiveSubscription {
  id: string
  status: string
  startedAt: string
  // null = never expires (Free tier)
  expiresAt: string | null
  autoRenew: boolean
  plan: SubscriptionPlan
}

export interface UpgradeResponse {
  requiresPayment: true
  paymentId: string
  gateway: string
  authorizationUrl: string
  amountKobo: number
  currency: string
}

export const subscriptions = {
  listPlans: () => request<{ data: SubscriptionPlan[] }>('/subscriptions/plans'),

  getMy: () => request<{ data: ActiveSubscription | null }>('/subscriptions/me'),

  // billingCycle must match backend BillingCycle enum: 'monthly' | 'quarterly' | 'annually'
  // Use this only for Free plan or admin-initiated flows. Patient upgrades to
  // paid plans must go through `upgrade()` so payment is collected first.
  subscribe: (planId: string, billingCycle: string) =>
    request<{ data: ActiveSubscription }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle }),
    }),

  // Patient-facing paid upgrade. Returns a gateway authorization URL the
  // caller should redirect the browser to. Subscription is activated by the
  // payment webhook once the gateway confirms the charge.
  upgrade: (planId: string, billingCycle: string, gateway?: 'Paystack') =>
    request<UpgradeResponse>('/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle, ...(gateway && { gateway }) }),
    }),

  cancel: (subscriptionId: string) =>
    request<{ message: string }>(`/subscriptions/${subscriptionId}`, { method: 'DELETE' }),
}

// ── TeleCare ──────────────────────────────────────────────────────────────

export interface TelecareSession {
  id: string
  hhaRef: string
  status: string
  scheduledAt: string
  startedAt?: string
  endedAt?: string
  durationSeconds?: number
  meetingUrl?: string
  recordingUrl?: string
  patientRating?: number
  patientFeedback?: string
  provider?: { firstName: string; lastName: string; title?: string }
  notes?: {
    chiefComplaint?: string
    assessment?: string
    plan?: string
    followUpDays?: number
  }
}

export const telecare = {
  list: () => request<{ data: TelecareSession[] }>('/telecare/sessions'),
  get: (id: string) => request<{ data: TelecareSession }>(`/telecare/sessions/${id}`),
  getToken: (id: string) => request<{ token: string; serverUrl: string; roomName: string }>(`/telecare/sessions/${id}/token`, {
    method: 'POST',
  }),
  // Patients can only flip status → completed on their own session (server
  // enforces this). Used to advance state when the patient hangs up or
  // closes the tab so the row doesn't sit at "active" forever.
  markCompleted: (id: string) =>
    request<{ id: string; status: string; endedAt: string | null }>(
      `/telecare/sessions/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', endedAt: new Date().toISOString() }),
      },
    ),
  rate: (id: string, rating: number, feedback?: string) =>
    request<TelecareSession>(`/telecare/sessions/${id}/rate`, {
      method: 'PATCH',
      body: JSON.stringify({ rating, feedback }),
    }),
}

// ── TeleCare guest invites (caregiver/family) ──────────────────────────────

export interface TelecareGuestInvite {
  id: string
  guestName: string
  guestEmail: string
  isRevoked: boolean
  verifiedAt?: string | null
  createdAt: string
}

export const telecareGuestInvites = {
  list: (sessionId: string) =>
    request<TelecareGuestInvite[]>(`/telecare/sessions/${sessionId}/guest-invites`),

  create: (sessionId: string, guestName: string, guestEmail: string) =>
    request<TelecareGuestInvite>(`/telecare/sessions/${sessionId}/guest-invites`, {
      method: 'POST',
      body: JSON.stringify({ guestName, guestEmail }),
    }),

  revoke: (sessionId: string, inviteId: string) =>
    request<TelecareGuestInvite>(`/telecare/sessions/${sessionId}/guest-invites/${inviteId}`, {
      method: 'DELETE',
    }),
}

// Public guest-join flow (no auth token — the invite token in the URL plus
// an email OTP are the only credentials).
export interface TelecareGuestPublicInfo {
  guestName: string
  patientFirstName: string
  providerName: string | null
  scheduledAt: string
  sessionStatus: string
  canJoin: boolean
}

export interface TelecareGuestLivekitJoin {
  token: string
  serverUrl: string
  roomName: string
  guestName: string
}

export const telecareGuest = {
  resolve: (token: string) =>
    fetch(`${PUBLIC_BASE}/telecare/guest/${token}`).then(r => {
      if (!r.ok) return r.json().then(b => Promise.reject(new Error(b.message ?? 'Invite link not found')))
      return r.json() as Promise<TelecareGuestPublicInfo>
    }),

  requestOtp: (token: string) =>
    fetch(`${PUBLIC_BASE}/telecare/guest/${token}/otp`, { method: 'POST' }).then(r => {
      if (!r.ok) return r.json().then(b => Promise.reject(new Error(b.message ?? 'Failed to send code')))
      return r.json() as Promise<{ ok: boolean }>
    }),

  verifyOtp: (token: string, code: string) =>
    fetch(`${PUBLIC_BASE}/telecare/guest/${token}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).then(r => {
      if (!r.ok) return r.json().then(b => Promise.reject(new Error(b.message ?? 'Invalid code')))
      return r.json() as Promise<TelecareGuestLivekitJoin>
    }),
}

// ── Dispatch ──────────────────────────────────────────────────────────────

export interface DispatchCase {
  id: string
  status: string
  emergencyType: string
  description?: string
  latitude?: number
  longitude?: number
  locationAddress?: string
  contactPhone?: string
  createdAt: string
  events?: Array<{
    id: string
    status: string
    notes?: string
    createdAt: string
  }>
}

export const dispatch = {
  create: (data: {
    emergencyType: string
    description?: string
    latitude?: number
    longitude?: number
    locationAddress?: string
    contactPhone?: string
  }) =>
    request<{ data: DispatchCase }>('/dispatch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => request<{ data: DispatchCase[] }>('/dispatch'),

  get: (id: string) => request<{ data: DispatchCase }>(`/dispatch/${id}`),
}

// ── Providers ─────────────────────────────────────────────────────────────

export interface Provider {
  id: string
  title?: string
  firstName: string
  lastName: string
  specialty?: string
  rating?: number
  isAvailable: boolean
}

export const providers = {
  search: (query: string, limit = 8) =>
    request<{ data: Provider[] }>(`/providers?search=${encodeURIComponent(query)}&limit=${limit}`),
}

// ── Consents ──────────────────────────────────────────────────────────────

export interface ConsentRecord {
  id: string
  consentType: string
  granted: boolean
  grantedAt?: string
  revokedAt?: string
}

export const consents = {
  upsert: (data: { consentType: string; granted: boolean; version?: string }) =>
    request<{ data: ConsentRecord }>('/consents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => request<{ data: ConsentRecord[] }>('/consents'),
}

// ── Feature Flags ─────────────────────────────────────────────────────────

export const features = {
  getFlags: () => request<Record<string, boolean>>('/admin/features'),
}

// ── Record Shares ──────────────────────────────────────────────────────────

export type ShareAccessMode = 'public' | 'email_list' | 'password'

export interface RecordShare {
  id: string
  label?: string
  accessMode: ShareAccessMode
  allowedEmails: string[]
  recordTypes: string[]
  expiresAt?: string
  isRevoked: boolean
  revokedAt?: string
  detectForwarding: boolean
  createdAt: string
  _count: { accesses: number }
}

export interface CreateShareParams {
  label?: string
  accessMode: 'email_list'
  allowedEmails: string[]
  recordTypes?: string[]
  expiresAt?: string
  detectForwarding?: boolean
  notifyRecipients?: boolean
  recipientPhones?: string[]
}

export interface ShareRecord {
  id: string
  hhaRef: string
  recordType: string
  title: string
  description?: string
  recordedAt: string
  fileUrl?: string
  fileMimeType?: string
  isDownloadable: boolean
  provider?: { firstName: string; lastName: string; title: string; specialty: string }
}

export interface SharePayload {
  shareId: string
  patientName: string
  recordTypes: string[]
  expiresAt?: string
  records: ShareRecord[]
}

export const shares = {
  create: (data: CreateShareParams) =>
    request<{ id: string; token: string; share: RecordShare; notified: { emails: number; phones: number } }>('/shares', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => request<RecordShare[]>('/shares'),

  audit: (id: string) =>
    request<{ share: RecordShare; accesses: Array<{ id: string; action: string; visitorEmail?: string; occurredAt: string; ipAddress?: string }> }>(
      `/shares/${id}/audit`,
    ),

  revoke: (id: string) =>
    request<RecordShare>(`/shares/${id}`, { method: 'DELETE' }),

  reportForward: (id: string, suspectedRecipientEmail?: string) =>
    request<{ ok: boolean }>(`/shares/${id}/report-forward`, {
      method: 'POST',
      body: JSON.stringify({ suspectedRecipientEmail }),
    }),
}

// Public share functions (no auth token required)
const PUBLIC_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

export const publicShare = {
  resolve: (token: string) =>
    fetch(`${PUBLIC_BASE}/s/${token}`).then(r => {
      if (!r.ok) return r.json().then(b => Promise.reject(new Error(b.message ?? 'Failed to load share')))
      return r.json() as Promise<SharePayload | { shareId: string; accessMode: ShareAccessMode; recordTypes: string[]; requiresAuth: true }>
    }),

  requestOtp: (token: string, email: string) =>
    fetch(`${PUBLIC_BASE}/s/${token}/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(r => {
      if (!r.ok) return r.json().then(b => Promise.reject(new Error(b.message ?? 'Failed to send code')))
      return r.json() as Promise<{ ok: boolean }>
    }),

  verifyOtp: (token: string, email: string, code: string) =>
    fetch(`${PUBLIC_BASE}/s/${token}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    }).then(r => {
      if (!r.ok) return r.json().then(b => Promise.reject(new Error(b.message ?? 'Invalid code')))
      return r.json() as Promise<SharePayload>
    }),

  verifyPassword: (token: string, password: string) =>
    fetch(`${PUBLIC_BASE}/s/${token}/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then(r => {
      if (!r.ok) return r.json().then(b => Promise.reject(new Error(b.message ?? 'Incorrect password')))
      return r.json() as Promise<SharePayload>
    }),
}

// ── TravelSafe ────────────────────────────────────────────────────────────

export type TravelSafeStatus = 'preparing' | 'active' | 'completed' | 'cancelled'

export interface TravelSafeTrip {
  id: string
  patientId: string
  partnerCode?: string
  partnerName?: string
  destinationCountry: string
  departureDate: string
  returnDate?: string
  purpose?: string
  status: TravelSafeStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TravelSafeSummary {
  trip: TravelSafeTrip
  patient: {
    name: string
    dateOfBirth: string
    bloodGroup?: string
    genotype?: string
    nextOfKin: { name?: string; relationship?: string; phone?: string }
    allergies: string[]
    chronicConditions: string[]
    activeMedications: string[]
    immunizations: string[]
  }
}

// ── Expert Review Cases ───────────────────────────────────────────────────

export interface ExpertReviewStatusEvent {
  id: string
  status?: string
  note?: string | null
  occurredAt?: string
  createdAt?: string
}

export interface ExpertReviewCaseItem {
  id: string
  hhaRef: string
  reviewType: string
  urgency: string
  status: string
  clinicalQuestion: string
  primaryDiagnosis?: string | null
  submittedAt: string
  completedAt?: string | null
  statusEvents?: ExpertReviewStatusEvent[]
  finalReport?: { id: string; createdAt: string } | null
}

export const expertReview = {
  list: () => request<ExpertReviewCaseItem[]>('/expert-review'),
  get: (id: string) => request<ExpertReviewCaseItem>(`/expert-review/${id}`),
}

// ── Analytics (fire-and-forget) ───────────────────────────────────────────

export const analytics = {
  // Never awaited by callers and never surfaces errors — product telemetry
  // must not affect the user experience.
  track: (eventType: string, metadata?: Record<string, unknown>) => {
    request<void>('/analytics/events', {
      method: 'POST',
      body: JSON.stringify({ eventType, metadata }),
    }).catch(() => undefined)
  },
}

// ── Support Tickets ───────────────────────────────────────────────────────

export interface SupportMessage {
  id: string
  senderId: string
  body: string
  attachmentUrl?: string | null
  isInternal: boolean
  createdAt: string
}

export interface SupportTicket {
  id: string
  hhaRef: string
  category: string
  subject: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  messages?: SupportMessage[]
  _count?: { messages: number }
}

export const support = {
  list: (status?: string) =>
    request<SupportTicket[]>(`/support/tickets${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  get: (id: string) => request<SupportTicket>(`/support/tickets/${id}`),

  create: (data: { subject: string; description: string; category?: string; priority?: string }) =>
    request<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addMessage: (id: string, message: string) =>
    request<SupportMessage>(`/support/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
}

export const travelsafe = {
  create: (data: {
    destinationCountry: string
    departureDate: string
    returnDate?: string
    purpose?: string
    partnerCode?: string
    partnerName?: string
    notes?: string
  }) =>
    request<{ data: TravelSafeTrip }>('/travelsafe/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => request<{ data: TravelSafeTrip[] }>('/travelsafe/trips'),

  get: (id: string) => request<{ data: TravelSafeTrip }>(`/travelsafe/trips/${id}`),

  update: (
    id: string,
    data: Partial<{
      destinationCountry: string
      departureDate: string
      returnDate: string
      purpose: string
      partnerCode: string
      partnerName: string
      notes: string
      status: TravelSafeStatus
    }>,
  ) =>
    request<{ data: TravelSafeTrip }>(`/travelsafe/trips/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<{ deleted: boolean }>(`/travelsafe/trips/${id}`, { method: 'DELETE' }),

  getSummary: (id: string) =>
    request<{ data: TravelSafeSummary }>(`/travelsafe/trips/${id}/summary`),
}

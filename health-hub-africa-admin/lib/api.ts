import { friendlyApiError, friendlyNetworkError, friendlySessionExpired } from './errorMessages'

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

const ACCESS_COOKIE = 'hha_at'

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

// Clears the JS-readable access token; hha_rt is HttpOnly and cleared server-side by /api/auth/logout
export function clearTokens() {
  deleteCookie(ACCESS_COOKIE)
}

// ── Core fetch wrapper ────────────────────────────────────────────────────

const GET_CACHE_TTL_MS = 3000
const inflightGetRequests = new Map<string, Promise<unknown>>()
const recentGetResults = new Map<string, { data: unknown; expiresAt: number }>()

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
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

// ── BFF route handler helper (same-origin Next.js /api/auth/* routes) ────

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

async function attemptTokenRefresh(): Promise<boolean> {
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

export interface User {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'coordinator' | 'patient' | 'provider'
  fullName?: string
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
  login: (email: string, password: string) =>
    bffFetch<{ accessToken: string } | { requiresTwoFactor: true; userId: string }>('/api/auth/login', { email, password }),

  verify2fa: (userId: string, otp: string) =>
    bffFetch<{ accessToken: string }>('/api/auth/verify-2fa', { userId, otp }),

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

  // ── Settings endpoints (shared with the patient portal) ──────────────
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  get2fa: () => request<{ twoFactorEnabled: boolean }>('/auth/2fa'),

  toggle2fa: (enabled: boolean) =>
    request<{ twoFactorEnabled: boolean; message: string }>('/auth/2fa', {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),

  getNotificationPreferences: () =>
    request<{ data: NotificationPrefs }>('/auth/notification-preferences'),

  updateNotificationPreferences: (prefs: Partial<NotificationPrefs>) =>
    request<{ data: NotificationPrefs }>('/auth/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }),

  listSessions: () => request<{ data: Session[] }>('/auth/sessions'),

  revokeSession: (sessionId: string) =>
    request<{ message: string }>(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),

  logoutAll: () => request<{ message: string }>('/auth/logout-all', { method: 'POST' }),
}

// ── Admin: Users ──────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string
  role: string
  fullName?: string
  phoneNumber?: string
  isActive: boolean
  isVerified: boolean
  createdAt: string
  lastLoginAt?: string
  subscription?: {
    plan: string
    tier: string
    status: string
    expiresAt: string
  }
  patient?: {
    id: string
    hhaPatientId: string
    firstName: string
    lastName: string
    openemrSyncStatus: string
    openemrPatientUuid?: string | null
  }
}

// ── Admin: Analytics ──────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalUsers: number
  activeSubscriptions: number
  mrr: number
  newUsersToday: number
  appointmentsToday: number
  activeDispatch: number
  openemrSyncErrors: number
  userGrowthPct: number
  subscriptionGrowthPct: number
  mrrGrowthPct: number
}

export interface RevenueDataPoint {
  date: string
  amount: number
  gateway: string
}

export interface UsageDataPoint {
  date: string
  appointments: number
  telecare: number
  dispatch: number
  labOrders: number
  expertReviews: number
}

// ── Admin: Audit Logs ─────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  userId: string
  userEmail: string
  action: string
  resource: string
  resourceId?: string
  ipAddress?: string
  createdAt: string
  meta?: Record<string, unknown>
}

// ── Admin: Patients ───────────────────────────────────────────────────────

export interface AdminPatient {
  id: string; hhaPatientId: string; firstName: string; lastName: string
  email: string; phone?: string
  openemrSyncStatus: string; openemrPatientUuid?: string | null
  subscriptionPlan?: string; subscriptionStatus?: string; createdAt: string
}

// ── Admin: Subscriptions ──────────────────────────────────────────────────

export interface AdminSubscription {
  id: string; patientId: string; patientName: string; hhaPatientId: string
  planName: string; tier: string; status: string; startedAt: string
  expiresAt: string; autoRenew: boolean; cancelledAt?: string
}

// ── Admin: Payments ───────────────────────────────────────────────────────

export interface AdminPayment {
  id: string; hhaRef: string; patientId: string; patientName: string
  amountKobo: number; currency: string; status: string; gateway: string
  description: string; paidAt?: string; createdAt: string
}

// ── Admin: Providers ──────────────────────────────────────────────────────

export interface AdminProvider {
  id: string; userId: string; firstName: string; lastName: string
  title: string; specialty: string; email: string; isAvailable: boolean
  totalPatients: number; rating?: string; licenseNumber?: string; createdAt: string
}

export interface ImportProviderResult {
  imported: number
  skipped: number
  total: number
  providers: Array<{ email: string; firstName: string; lastName: string; tempPassword?: string; status: 'imported' | 'skipped'; reason?: string }>
}

// ── Provider: TeleCare Sessions ──────────────────────────────────────────

export type ProviderSessionStatus = 'scheduled' | 'active' | 'in_progress' | 'completed' | 'cancelled' | 'missed'

export interface SessionNote {
  id: string
  sessionId: string
  chiefComplaint?: string | null
  assessment?: string | null
  plan?: string | null
  createdAt: string
}

export interface ProviderSession {
  id: string
  hhaRef: string
  status: ProviderSessionStatus
  scheduledAt: string
  startedAt?: string | null
  endedAt?: string | null
  durationSeconds?: number | null
  meetingUrl?: string | null
  recordingUrl?: string | null
  patient?: {
    firstName: string
    lastName: string
    dateOfBirth?: string | null
    gender?: string | null
    openemrPatientUuid?: string | null
    subscriptions?: Array<{ plan: { name: string; tier: string } }> | null
  } | null
  provider?: { firstName: string; lastName: string; title: string } | null
  notes?: SessionNote[]
}

export interface LiveKitJoinInfo {
  token: string
  serverUrl: string
  roomName: string
}

export interface AvailableProvider {
  id: string
  firstName: string
  lastName: string
  title: string
  specialty: string
}

export interface ProviderShift {
  id: string
  providerId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isTelecare: boolean
  createdAt: string
}

export interface ProviderAppointment {
  id: string
  hhaRef: string
  status: 'requested' | 'confirmed' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  scheduledAt: string
  durationMinutes: number
  serviceType: string
  isTelecare: boolean
  reason?: string | null
  patient?: { firstName: string; lastName: string } | null
}

// ── Admin: Clinical Queue ─────────────────────────────────────────────────

export interface ClinicalQueueItem {
  id: string; type: 'teleconsult' | 'expert_review'; patientName: string
  providerName?: string; status: string; createdAt: string; waitMinutes: number
}

// ── Admin: Support Tickets ────────────────────────────────────────────────

type NameRecord = { firstName: string; lastName: string } | null

export interface AdminSupportTicket {
  id: string
  hhaRef: string
  subject: string
  category: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  submittedBy: string
  submitter: { email: string; patient?: NameRecord; provider?: NameRecord }
  assignee?: { email: string; patient?: NameRecord; provider?: NameRecord } | null
  _count: { messages: number }
}

export interface SupportMessage {
  id: string
  senderId: string
  body: string
  createdAt: string
}

export interface AdminSupportTicketDetail extends AdminSupportTicket {
  messages: SupportMessage[]
}

// ── Admin: Feature Flags ──────────────────────────────────────────────────

export interface FeatureFlag {
  key: string; label: string; description: string; enabled: boolean
}

// ── Admin: Notifications ──────────────────────────────────────────────────

export interface NotificationDelivery {
  id: string; channel: string; recipient: string; subject?: string
  status: string; sentAt?: string; failedAt?: string; failureReason?: string; createdAt: string
}

// ── Admin: Audit Log Detail ───────────────────────────────────────────────

export interface AuditLogDetail {
  id: string; userId?: string; userEmail: string; userRole?: string
  action: string; resource: string; resourceId?: string; severity: string
  metadata?: unknown; ipAddress?: string; userAgent?: string
  patient?: { id: string; name: string; hhaPatientId: string }
  createdAt: string
}

// ── Admin: Facility ───────────────────────────────────────────────────────

export interface Facility {
  id: string
  name: string
  type: string
  address: string
  city: string
  state: string
  country: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: string
}

// ── Admin: CMS ────────────────────────────────────────────────────────────

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  bodyHtml: string
  coverImageUrl?: string | null
  category: string
  tags: string[]
  status: 'draft' | 'published'
  publishedAt?: string | null
  authorName: string
  authorTitle?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  readMinutes?: number | null
  createdAt: string
  updatedAt: string
}

export interface Testimonial {
  id: string
  authorName: string
  authorTitle?: string | null
  authorCompany?: string | null
  authorPhotoUrl?: string | null
  quote: string
  rating: number
  isFeatured: boolean
  status: 'draft' | 'published'
  serviceType?: string | null
  createdAt: string
  updatedAt: string
}

// ── Admin API namespace ───────────────────────────────────────────────────

export const adminApi = {
  users: {
    list: (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) => {
      const qs = params
        ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
        : ''
      return request<{ data: AdminUser[]; meta: { total: number; page: number; limit: number } }>(`/admin/users${qs}`)
    },
    get: (id: string) => request<{ data: AdminUser }>(`/admin/users/${id}`),
    updateRole: (id: string, role: string) =>
      request<{ data: AdminUser }>(`/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    toggleStatus: (id: string, active: boolean) =>
      request<{ data: AdminUser }>(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }),
    resendVerification: (id: string) =>
      request<{ message: string }>(`/admin/users/${id}/resend-verification`, { method: 'POST' }),
    sendOnboarding: (id: string) =>
      request<{ message: string }>(`/admin/users/${id}/resend-onboarding`, { method: 'POST' }),
  },

  analytics: {
    summary: () => request<{ data: AnalyticsSummary }>('/admin/analytics/summary'),
    revenue: (period = '30d') =>
      request<{ data: RevenueDataPoint[] }>(`/admin/analytics/revenue?period=${period}`),
    usage: (period = '30d') =>
      request<{ data: UsageDataPoint[] }>(`/admin/analytics/usage?period=${period}`),
  },

  auditLogs: {
    list: (params?: { userId?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) => {
      const qs = params
        ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
        : ''
      return request<{ data: AuditLog[]; meta: { total: number } }>(`/admin/audit-logs${qs}`)
    },
    get: (id: string) => request<{ data: AuditLogDetail }>(`/admin/audit-logs/${id}`),
  },

  facilities: {
    list: () => request<{ data: Facility[] }>('/admin/facilities'),
    get: (id: string) => request<{ data: Facility }>(`/admin/facilities/${id}`),
    // Disabled — backend now rejects with a 400 since OpenEMR is the source
    // of truth. Kept on the client for backward compatibility with anything
    // still calling it; new UI should use importFromOpenemr instead.
    create: (data: Partial<Facility>) =>
      request<{ data: Facility }>('/admin/facilities', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Facility>) =>
      request<{ data: Facility }>(`/admin/facilities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/admin/facilities/${id}`, { method: 'DELETE' }),
    importFromOpenemr: () =>
      request<{
        imported: number
        updated: number
        skipped: number
        results: Array<{ name: string; openemrId: string; status: 'imported' | 'updated' | 'skipped'; reason?: string }>
      }>('/admin/facilities/import-from-openemr', { method: 'POST' }),
  },

  patients: {
    list: (params?: { search?: string; page?: number; limit?: number }) => {
      const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : ''
      return request<{ data: AdminPatient[]; meta: { total: number; page: number; limit: number } }>(`/admin/patients${qs}`)
    },
  },

  openemr: {
    recoverAll: () =>
      request<{ enqueued: number }>('/openemr/recover-all', { method: 'POST' }),
  },

  // Provider-scoped (uses /telecare endpoints, not /admin — scoped by JWT)
  providerTelecare: {
    sessions: () =>
      request<{ data: ProviderSession[] }>('/telecare/sessions'),
    joinToken: (sessionId: string) =>
      request<LiveKitJoinInfo>(`/telecare/sessions/${sessionId}/token`, { method: 'POST' }),
    updateStatus: (sessionId: string, status: string, extra?: { startedAt?: string; endedAt?: string }) =>
      request<void>(`/telecare/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...extra }),
      }),
    createNote: (dto: {
      sessionId: string
      subjectiveNotes: string
      objectiveNotes?: string
      assessment?: string
      plan?: string
      followUpInstructions?: string
    }) =>
      request<SessionNote>('/telecare/notes', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    setAvailability: (isAvailable: boolean) =>
      request<{ id: string; isAvailable: boolean }>('/telecare/availability', {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      }),
    metrics: () =>
      request<{
        total: number
        completed: number
        missed: number
        cancelled: number
        avgDurationSeconds: number | null
      }>('/telecare/metrics'),
    waitingSessions: () =>
      request<{ data: ProviderSession[] }>('/telecare/sessions?status=waiting'),
    acceptSession: (id: string) =>
      request<ProviderSession>(`/telecare/sessions/${id}/accept`, { method: 'POST' }),
    declineSession: (id: string) =>
      request<ProviderSession>(`/telecare/sessions/${id}/decline`, { method: 'POST' }),
    transferSession: (id: string, toProviderId: string) =>
      request<ProviderSession>(`/telecare/sessions/${id}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ toProviderId }),
      }),
    availableProviders: () =>
      request<AvailableProvider[]>('/telecare/available-providers'),
    shifts: {
      list: () => request<ProviderShift[]>('/telecare/shifts'),
      create: (dto: { dayOfWeek: number; startTime: string; endTime: string }) =>
        request<ProviderShift>('/telecare/shifts', {
          method: 'POST',
          body: JSON.stringify(dto),
        }),
      delete: (id: string) =>
        request<void>(`/telecare/shifts/${id}`, { method: 'DELETE' }),
    },
  },

  // Provider-scoped (uses /appointments, not /admin — scoped by JWT providerId)
  providerAppointments: {
    list: (params?: { status?: string; page?: number; limit?: number }) => {
      const qs = params
        ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
        : ''
      return request<{ data: ProviderAppointment[]; meta: { total: number } }>(`/appointments${qs}`)
    },
    updateStatus: (id: string, status: string, cancellationReason?: string) =>
      request<unknown>(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, cancellationReason }),
      }),
  },

  subscriptions: {
    list: (params?: { status?: string; page?: number; limit?: number }) => {
      const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : ''
      return request<{ data: AdminSubscription[]; meta: { total: number } }>(`/admin/subscriptions${qs}`)
    },
    cancel: (id: string) => request<void>(`/admin/subscriptions/${id}/cancel`, { method: 'PATCH' }),
    override: (patientId: string, planId: string, billingCycle: 'monthly' | 'annually') =>
      request<{ done: boolean }>(`/admin/patients/${patientId}/subscription/override`, {
        method: 'POST',
        body: JSON.stringify({ planId, billingCycle }),
      }),
  },

  payments: {
    list: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
      const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : ''
      return request<{ data: AdminPayment[]; meta: { total: number } }>(`/admin/payments${qs}`)
    },
    confirmManual: (id: string) =>
      request<{ confirmed?: boolean; already?: boolean }>(`/admin/payments/${id}/confirm`, { method: 'PATCH' }),
  },

  providers: {
    list: (params?: { search?: string; page?: number; limit?: number }) => {
      const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : ''
      return request<{ data: AdminProvider[]; meta: { total: number } }>(`/admin/providers${qs}`)
    },
    toggleAvailability: (id: string, available: boolean) =>
      request<void>(`/admin/providers/${id}/availability`, { method: 'PATCH', body: JSON.stringify({ available }) }),
    importFromOpenemr: () =>
      request<ImportProviderResult>('/admin/providers/import-from-openemr', { method: 'POST' }),
  },

  clinicalQueue: {
    get: () => request<{ teleconsults: ClinicalQueueItem[]; expertReviews: ClinicalQueueItem[]; total: number }>('/admin/clinical-queue'),
  },

  support: {
    list: (status?: string) =>
      request<AdminSupportTicket[]>(`/support/tickets${status ? `?status=${status}` : ''}`),
    getTicket: (id: string) =>
      request<AdminSupportTicketDetail>(`/support/tickets/${id}`),
    updateStatus: (id: string, status: string, assignedToId?: string) =>
      request<AdminSupportTicket>(`/support/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, assignedToId }),
      }),
    addMessage: (id: string, message: string) =>
      request(`/support/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ message }) }),
  },

  featureFlags: {
    list: () => request<FeatureFlag[]>('/admin/feature-flags'),
    set: (key: string, enabled: boolean) =>
      request<FeatureFlag[]>(`/admin/feature-flags/${key}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  },

  notifications: {
    list: (params?: { channel?: string; status?: string; page?: number; limit?: number }) => {
      const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : ''
      return request<{ data: NotificationDelivery[]; meta: { total: number } }>(`/admin/notifications${qs}`)
    },
    resend: (id: string) => request<{ message: string }>(`/admin/notifications/${id}/resend`, { method: 'POST' }),
  },

  system: {
    syncQueue: () => request<{ data: unknown[] }>('/admin/system/sync-queue'),
    retrySyncItem: (id: string) =>
      request<{ message: string }>(`/admin/system/sync-queue/${id}/retry`, { method: 'POST' }),
    errors: () => request<{ data: unknown[] }>('/admin/system/errors'),
    retryError: (id: string) =>
      request<{ message: string }>(`/admin/system/errors/${id}/retry`, { method: 'POST' }),
    health: () => request<{ data: Record<string, string> }>('/admin/system/health'),
  },

  operations: {
    appointments: (params?: { status?: string; page?: number; limit?: number }) => {
      const qs = params
        ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
        : ''
      return request<{ data: unknown[]; meta: { total: number } }>(`/admin/operations/appointments${qs}`)
    },
    telecare: (params?: { status?: string; page?: number }) => {
      const qs = params
        ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
        : ''
      return request<{ data: unknown[]; meta: { total: number } }>(`/admin/operations/telecare${qs}`)
    },
    dispatch: () => request<{ data: unknown[] }>('/admin/operations/dispatch'),
    labs: (params?: { flagged?: boolean; page?: number }) => {
      const qs = params
        ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
        : ''
      return request<{ data: unknown[]; meta: { total: number } }>(`/admin/operations/labs${qs}`)
    },
    expertReview: (params?: { status?: string; page?: number }) => {
      const qs = params
        ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
        : ''
      return request<{ data: unknown[]; meta: { total: number } }>(`/admin/operations/expert-review${qs}`)
    },
    updateAppointmentStatus: (id: string, status: string, cancellationReason?: string) =>
      request<unknown>(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, cancellationReason }),
      }),
    // Admin / coordinator assigns a provider to an appointment. The provider
    // becomes the assignee for the auto-spawned TelecareSession on confirm.
    assignAppointmentProvider: (id: string, providerId: string) =>
      request<unknown>(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ providerId }),
      }),
  },

  cms: {
    requestUploadUrl: (contentType: string, sizeBytes: number) =>
      request<{ uploadUrl: string; objectKey: string; publicUrl: string }>('/admin/cms/upload-url', {
        method: 'POST',
        body: JSON.stringify({ contentType, sizeBytes }),
      }),

    blog: {
      list: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
        const qs = params
          ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
          : ''
        return request<{ data: BlogPost[]; meta: { total: number; page: number; limit: number } }>(`/admin/cms/blog${qs}`)
      },
      get: (id: string) => request<{ data: BlogPost }>(`/admin/cms/blog/${id}`),
      create: (data: Partial<BlogPost>) =>
        request<{ data: BlogPost }>('/admin/cms/blog', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Partial<BlogPost>) =>
        request<{ data: BlogPost }>(`/admin/cms/blog/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<void>(`/admin/cms/blog/${id}`, { method: 'DELETE' }),
    },

    testimonials: {
      list: (params?: { status?: string; page?: number; limit?: number }) => {
        const qs = params
          ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()
          : ''
        return request<{ data: Testimonial[]; meta: { total: number; page: number; limit: number } }>(`/admin/cms/testimonials${qs}`)
      },
      create: (data: Partial<Testimonial>) =>
        request<{ data: Testimonial }>('/admin/cms/testimonials', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Partial<Testimonial>) =>
        request<{ data: Testimonial }>(`/admin/cms/testimonials/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<void>(`/admin/cms/testimonials/${id}`, { method: 'DELETE' }),
    },
  },

  plans: {
    list: () => request<{ data: Array<{ id: string; name: string; tier: string; slug: string }> }>('/subscriptions/plans'),
  },
}

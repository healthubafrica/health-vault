import { friendlyApiError, friendlyNetworkError, friendlySessionExpired } from './errorMessages'

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

const ACCESS_COOKIE = 'hha_at'
const REFRESH_COOKIE = 'hha_rt'

// ── Cookie helpers ────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Strict${secure}`
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Strict`
}

export function saveTokens(access: string, refresh: string) {
  setCookie(ACCESS_COOKIE, access, 900)
  setCookie(REFRESH_COOKIE, refresh, 604800)
}

export function clearTokens() {
  deleteCookie(ACCESS_COOKIE)
  deleteCookie(REFRESH_COOKIE)
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

async function attemptTokenRefresh(): Promise<boolean> {
  const refresh = getCookie(REFRESH_COOKIE)
  if (!refresh) return false
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-refresh-token': refresh },
    })
    if (!res.ok) return false
    const data = (await res.json()) as { accessToken: string; refreshToken: string }
    saveTokens(data.accessToken, data.refreshToken)
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

export interface User {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'coordinator' | 'patient' | 'provider'
  fullName?: string
}

export const auth = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ data: User }>('/auth/me'),

  logout: () => request<void>('/auth/logout', { method: 'POST' }),

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
}

// ── Admin: Users ──────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string
  role: string
  fullName?: string
  phoneNumber?: string
  isActive: boolean
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
  },

  facilities: {
    list: () => request<{ data: Facility[] }>('/admin/facilities'),
    get: (id: string) => request<{ data: Facility }>(`/admin/facilities/${id}`),
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
  },

  system: {
    syncQueue: () => request<{ data: unknown[] }>('/admin/system/sync-queue'),
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
  },
}

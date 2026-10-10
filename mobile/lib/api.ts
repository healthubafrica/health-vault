/**
 * Central API client for Health Hub Africa Mobile
 * Direct native client to the NestJS backend (health-hub-africa-api)
 * Mirrors the typed surface of the web patient portal lib/api.ts
 */

import * as SecureStore from 'expo-secure-store';
import * as analyticsClient from './analytics/client';

export const API_BASE =
  (process.env.EXPO_PUBLIC_API_URL ?? 'https://api.myvaultplus.com') + '/api/v1';

const REFRESH_TOKEN_KEY = 'hha_mobile_rt';
let inMemoryAccessToken: string | null = null;

// ── Token management ──────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export async function saveRefreshToken(token: string) {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (err) {
    console.error('Failed to save refresh token:', err);
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearStoredTokens() {
  inMemoryAccessToken = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {}
}

// ── Core fetch wrapper ────────────────────────────────────────────────────

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retryOnAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (inMemoryAccessToken) {
    headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      'Unable to connect to Health Hub Africa. Please check your internet connection.'
    );
  }

  if (res.status === 401 && retryOnAuth) {
    const outcome = await refreshSession();
    if (outcome === 'ok') return apiRequest<T>(path, options, false);
    if (outcome === 'rejected') {
      await clearStoredTokens();
      onSessionExpired?.();
      throw new ApiError(401, 'Your session has expired. Please sign in again.');
    }
    throw new ApiError(0, 'Unable to connect to Health Hub Africa. Please check your internet connection.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as { message?: string | string[] }).message;
    const resolved = Array.isArray(msg) ? msg.join(', ') : msg ?? 'An unexpected error occurred.';
    throw new ApiError(res.status, resolved, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Registered by the auth store so a dead session (refresh rejected) resets the
// UI state and routes to sign-in, without api.ts importing the store (cycle).
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null) {
  onSessionExpired = fn;
}

export type RefreshOutcome = 'ok' | 'rejected' | 'unreachable';

// Single-flight: concurrent 401s share one refresh. The backend rotates the
// refresh token on every use, so two parallel refreshes would make the second
// one fail and wrongly sign the user out.
let refreshInFlight: Promise<RefreshOutcome> | null = null;

export function refreshSession(): Promise<RefreshOutcome> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefresh(): Promise<RefreshOutcome> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return 'rejected';

  try {
    // The backend's jwt-refresh strategy reads ONLY the x-refresh-token header
    // (the web portal does the same); a JSON body is ignored and always 401s.
    const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-refresh-token': refreshToken },
    });
    if (res.status === 401 || res.status === 403) return 'rejected';
    if (!res.ok) return 'unreachable';
    const data = await res.json();
    if (!data.accessToken) return 'rejected';
    setAccessToken(data.accessToken);
    if (data.refreshToken) await saveRefreshToken(data.refreshToken);
    return 'ok';
  } catch {
    // Offline or timed out: the session may still be valid — don't sign out.
    return 'unreachable';
  }
}

const REQUEST_TIMEOUT_MS = 20_000;

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface PatientProfile {
  id: string;
  hhaPatientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  profilePhotoUrl?: string | null;
  bloodGroup?: string | null;
  genotype?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  nextOfKinName?: string | null;
  nextOfKinRelationship?: string | null;
  nextOfKinPhone?: string | null;
  status: string;
  preferredLanguage?: string | null;
  user: { email: string; phone?: string | null };
  medicalInfo?: {
    allergies: string[];
    chronicConditions: string[];
    activeMedications: string[];
    immunizations?: string[];
    heightCm?: number | string | null;
    weightKg?: number | string | null;
  } | null;
  emergencyContacts?: Array<{
    fullName: string;
    relationship: string;
    phone: string;
    isPrimary: boolean;
  }> | null;
}

export interface EmergencyContact {
  id: string;
  fullName: string;
  relationship: string;
  phone: string;
  email?: string | null;
  isPrimary: boolean;
}

export const emergencyContacts = {
  list: async (): Promise<EmergencyContact[]> => {
    const res = await apiRequest<{ data: EmergencyContact[] } | EmergencyContact[]>('/patients/me/emergency-contacts');
    return Array.isArray(res) ? res : res?.data ?? [];
  },
  create: (body: { fullName: string; relationship: string; phone: string; email?: string; isPrimary?: boolean }) =>
    apiRequest<{ data: EmergencyContact }>('/patients/me/emergency-contacts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (
    id: string,
    body: Partial<{ fullName: string; relationship: string; phone: string; email: string; isPrimary: boolean }>,
  ) =>
    apiRequest<{ data: EmergencyContact }>(`/patients/me/emergency-contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    apiRequest<{ data: { deleted: boolean } }>(`/patients/me/emergency-contacts/${id}`, { method: 'DELETE' }),
};

export interface VitalsReading {
  id: string;
  recordedAt: string;
  heartRate?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  spo2?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  temperatureC?: number | null;
  bloodGlucose?: number | null;
  hba1c?: number | null;
  haemoglobin?: number | null;
  sleepHours?: number | null;
}

export interface CreateVitalsPayload {
  recordedAt?: string;
  heartRate?: number;
  respiratoryRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  temperatureCelsius?: number;
  weightKg?: number;
  heightCm?: number;
  bloodGlucose?: number;
  bloodGlucoseContext?: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  hhaRef: string;
  serviceType: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  reason?: string | null;
  isTelecare: boolean;
  meetingUrl?: string | null;
  providerId?: string | null;
  provider?: { firstName: string; lastName: string; specialty: string; title: string } | null;
}

export interface ServiceProvider {
  id: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  specialty?: string | null;
  // Prisma Decimal: arrives as a string, so never call number methods on it directly.
  rating?: number | string | null;
  isAvailable: boolean;
  profilePhotoUrl?: string | null;
  bio?: string | null;
  yearsExperience?: number | null;
  languages?: string[] | null;
  subspecialties?: string[] | null;
  qualifications?: string[] | null;
  clinicName?: string | null;
  clinicCity?: string | null;
  clinicState?: string | null;
}

export interface SchedulingPolicy {
  cancellationWindowHours: number;
  rescheduleWindowHours: number;
  selfServiceEnabled: boolean;
}

export interface BookableFacility {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
}

export interface CreateAppointmentPayload {
  facilityId?: string;
  appointmentType: 'in_person' | 'virtual' | 'home_visit';
  serviceType?: string;
  scheduledAt: string;
  durationMinutes: number;
  chiefComplaint?: string;
  notes?: string;
  providerId?: string;
}

export interface ClinicalRecord {
  id: string;
  hhaRef: string;
  recordType: string;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  fileMimeType?: string | null;
  isDownloadable: boolean;
  recordedAt: string;
  provider?: { firstName: string; lastName: string; title: string } | null;
}

export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  route: string;
  refillsRemaining: number;
  expiresAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface LabOrder {
  id: string;
  hhaRef: string;
  orderedAt: string;
  overallStatus: string;
  labFacility?: string | null;
  results: Array<{
    id: string;
    testName: string;
    status: string;
    valueDisplay?: string | null;
    unit?: string | null;
    referenceRange?: string | null;
    isFlagged: boolean;
  }>;
  provider: { firstName: string; lastName: string; title: string };
}

export interface Payment {
  id: string;
  hhaRef: string;
  amountKobo: number;
  currency: string;
  status: string;
  gateway: string;
  description: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface CareTeamMember {
  id: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  specialty?: string | null;
  profilePhotoUrl?: string | null;
  rating?: number | null;
  isAvailable: boolean;
  yearsExperience?: number | null;
  lastVisitAt: string;
  visitCount: number;
}

export interface SupportTicket {
  id: string;
  hhaRef: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
}

// Mirrors NotificationsService.listPatientAlerts: `category` is the alert's
// referenceType (appointment | lab | payment | record | telecare | alert | system)
// and `actionUrl` is a web-portal path.
export interface Notification {
  id: string;
  category: string;
  title: string;
  body: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface TelecareSession {
  id: string;
  hhaRef: string;
  appointmentId?: string | null;
  status: string;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  meetingUrl?: string | null;
  provider?: { firstName: string; lastName: string; title?: string | null } | null;
}

export type AcquisitionSource = 'social_media' | 'friend' | 'referral' | 'family';

// ── API Namespaces ────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    apiRequest<{ accessToken: string; refreshToken: string } | { requiresTwoFactor: true; userId: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false
    ),

  register: async (email: string, password: string, phoneNumber: string | undefined, fullName: string, acquisitionSource: AcquisitionSource) =>
    apiRequest<{ message: string }>(
      '/auth/register',
      {
        method: 'POST',
        // No Patient row exists until onboarding, so the server can only
        // attribute registration_complete (spec §23) via this id.
        body: JSON.stringify({
          email, password, phoneNumber, fullName, acquisitionSource,
          anonymousVisitorId: await analyticsClient.getAnonymousVisitorId(),
        }),
      },
      false
    ),

  get2faStatus: () => apiRequest<{ twoFactorEnabled: boolean }>('/auth/2fa'),

  set2fa: (enabled: boolean) =>
    apiRequest<unknown>('/auth/2fa', { method: 'PATCH', body: JSON.stringify({ enabled }) }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<unknown>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  listSessions: () =>
    apiRequest<{ data: Array<{ id: string; ipAddress?: string | null; userAgent?: string | null; createdAt: string; expiresAt: string }> }>(
      '/auth/sessions'
    ),

  logoutAll: () => apiRequest<unknown>('/auth/logout-all', { method: 'POST' }),

  // Second step of login when /auth/login answers { requiresTwoFactor, userId }.
  verify2fa: (userId: string, otp: string) =>
    apiRequest<{ accessToken: string; refreshToken: string }>(
      '/auth/verify-2fa',
      { method: 'POST', body: JSON.stringify({ userId, otp }) },
      false
    ),

  verifyOtp: async (email: string, otp: string, type = 'email') =>
    apiRequest<{ accessToken: string; refreshToken: string }>(
      '/auth/verify-otp',
      {
        method: 'POST',
        // Same reasoning as register() — otp_verify_success (spec §23) has
        // no Patient row to attribute to yet either.
        body: JSON.stringify({
          email, otp, type,
          anonymousVisitorId: await analyticsClient.getAnonymousVisitorId(),
        }),
      },
      false
    ),

  me: () => apiRequest<{ data: User }>('/auth/me'),

  logout: () =>
    apiRequest<{ message: string }>('/auth/logout', { method: 'POST' }).catch(() => {}),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>(
      '/auth/forgot-password',
      { method: 'POST', body: JSON.stringify({ email }) },
      false
    ),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    apiRequest<{ message: string }>(
      '/auth/reset-password',
      { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) },
      false
    ),
};

export const patients = {
  getMyProfile: () => apiRequest<{ data: PatientProfile }>('/patients/me'),

  create: (data: Record<string, unknown>) =>
    apiRequest<{ data: PatientProfile }>(
      '/patients',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  update: (id: string, data: Record<string, unknown>) =>
    apiRequest<{ data: PatientProfile }>(
      `/patients/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),

  // Derived from appointment history, not a dedicated assignment table —
  // see patients.service.ts findMyCareTeam.
  getMyCareTeam: () => apiRequest<{ data: CareTeamMember[] }>('/patients/me/care-team'),

  updateOnboardingProgress: (step: number, stepName: string) =>
    apiRequest<unknown>('/patients/me/onboarding-progress', {
      method: 'PATCH',
      body: JSON.stringify({ step, stepName }),
    }),
};

export const vitals = {
  list: () => apiRequest<{ data: VitalsReading[] }>('/vitals'),

  create: (data: CreateVitalsPayload) =>
    apiRequest<{ data: VitalsReading }>(
      '/vitals',
      { method: 'POST', body: JSON.stringify(data) }
    ),
};

export const appointments = {
  // fromDate (ISO) is supported by the backend query DTO; `upcoming` drops anything already started.
  list: (params?: { status?: string; upcoming?: boolean; fromDate?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return apiRequest<{ data: Appointment[]; meta: { total: number } }>(`/appointments${qs}`);
  },

  listProviders: (serviceType: string, scheduledAt?: string) => {
    const params = new URLSearchParams({ serviceType });
    if (scheduledAt) params.set('scheduledAt', scheduledAt);
    return apiRequest<ServiceProvider[]>(`/appointments/providers?${params}`);
  },

  getSlots: (params: { serviceType: string; date: string; durationMinutes?: number; providerId?: string }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
    return apiRequest<Array<{ providerId: string; providerName: string; slots: string[] }>>(
      `/appointments/slots?${qs}`
    );
  },

  facilities: () => apiRequest<BookableFacility[]>('/appointments/facilities'),

  getSchedulingPolicy: () =>
    apiRequest<SchedulingPolicy>('/appointments/scheduling-policy'),

  // Resolves to the bare appointment — the controller returns the service
  // result unwrapped and no interceptor adds a { data } envelope. Only
  // list() is enveloped ({ data, meta }). The optional Idempotency-Key makes a
  // retried or double-tapped booking replay the first appointment instead of
  // creating a second one (the backend dedupes on it).
  create: (data: CreateAppointmentPayload, idempotencyKey?: string) =>
    apiRequest<Appointment>(
      '/appointments',
      {
        method: 'POST',
        body: JSON.stringify(data),
        ...(idempotencyKey && { headers: { 'Idempotency-Key': idempotencyKey } }),
      }
    ),

  cancel: (id: string, reason?: string) =>
    apiRequest<Appointment>(
      `/appointments/${id}/cancel`,
      { method: 'POST', body: JSON.stringify({ reason: reason ?? '' }) }
    ),

  // POST /appointments/:id/reschedule — moves a booked appointment to a new slot.
  reschedule: (id: string, scheduledAt: string, durationMinutes?: number) =>
    apiRequest<Appointment>(`/appointments/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt, ...(durationMinutes ? { durationMinutes } : {}) }),
    }),
};

// ── Analytics (fire-and-forget) ───────────────────────────────────────────
//
// Delegates to lib/analytics/client.ts, the central SDK wrapper (spec §22)
// shared in spirit with health-hub-africa/lib/api.ts's portal client. That
// module owns identity (SecureStore-backed anonymous visitor id + an
// in-memory, idle-timeout-rotating session id), eventId dedup, duplicate-
// tap debouncing, and a bounded retry queue.

export const analytics = {
  track: analyticsClient.track,
};

export const records = {
  list: (type?: string) => {
    const qs = type ? `?type=${encodeURIComponent(type)}` : '';
    return apiRequest<{ data: ClinicalRecord[]; meta: { total: number } }>(`/records${qs}`);
  },

  get: (id: string) => apiRequest<{ data: ClinicalRecord }>(`/records/${id}`),

  prescriptions: () => apiRequest<PrescriptionItem[]>('/records/prescriptions/list'),

  getStorageUsage: () => apiRequest<{ data: StorageUsage | null }>('/records/storage'),

  // Short-lived presigned S3 URL for a stored file. `fileUrl` is the stored
  // object URL; the backend wants just its key (the URL path without the slash).
  getDownloadUrl: (fileUrl: string) => {
    const objectKey = new URL(fileUrl).pathname.slice(1);
    return apiRequest<{ data: { downloadUrl: string } }>(`/records/download-url/${encodeURIComponent(objectKey)}`);
  },
};

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number | null;
  fileCount: number;
  maxFiles: number | null;
  maxFileSizeBytes: number | null;
}

// ── Vault Documents (patient uploads) ──────────────────────────────────────

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
  | 'miscellaneous';

export interface VaultDocument {
  id: string;
  hhaRef: string;
  recordType: string;
  title: string;
  description?: string | null;
  category: DocumentCategory | null;
  tags: string[];
  originalFileName?: string | null;
  source: string;
  fileUrl?: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
  providerVisibility: boolean;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListParams {
  q?: string;
  category?: DocumentCategory;
  sort?: 'title' | 'createdAt' | 'fileSizeBytes';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface DocumentUploadTicket {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
}

export const documents = {
  getUploadUrl: (data: { fileName: string; contentType: string; sizeBytes: number }) =>
    apiRequest<{ data: DocumentUploadTicket }>('/documents/upload-url', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  create: (data: {
    objectKey: string;
    fileName: string;
    title?: string;
    category: DocumentCategory;
    tags?: string[];
    description?: string;
  }) =>
    apiRequest<{ data: VaultDocument }>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (params?: DocumentListParams) => {
    const qs = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') qs.set(key, String(value));
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest<{ data: VaultDocument[]; meta: { total: number } }>(`/documents${suffix}`);
  },

  update: (id: string, data: Partial<{ title: string; description: string; category: DocumentCategory; tags: string[] }>) =>
    apiRequest<{ data: VaultDocument }>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (id: string) => apiRequest<void>(`/documents/${id}`, { method: 'DELETE' }),
};

export const labs = {
  listOrders: () => apiRequest<{ data: LabOrder[] }>('/labs/orders'),

  getOrder: (id: string) => apiRequest<{ data: LabOrder }>(`/labs/orders/${id}`),
};

export interface PaymentMethod {
  id: string;
  gateway: string;
  cardBrand?: string | null;
  last4?: string | null;
  expiryMonth?: string | null;
  expiryYear?: string | null;
  isDefault: boolean;
  createdAt: string;
}

// Generates a client-side key to send as the Idempotency-Key header on
// payment initiation. Needs to be unpredictable enough that two different
// attempts (this one and, say, an attacker racing to submit under a guessed
// key) never collide — Math.random() isn't a CSPRNG, so this prefers
// crypto.randomUUID()/getRandomValues where available and only falls back
// to Math.random() if neither exists at all. Callers should create one when
// a payment form mounts (or is reset) and reuse it across retries of that
// same attempt, not regenerate it per request.
export function generateIdempotencyKey(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // React Native has no crypto.randomUUID without a polyfill, so this is the path
  // that normally runs. Uniqueness (not secrecy) is what an idempotency key needs:
  // timestamp + per-process counter + two random draws.
  idempotencySeq += 1;
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${idempotencySeq.toString(36)}-${rand()}${rand()}`;
}

let idempotencySeq = 0;

export const payments = {
  // GET /payments returns a bare array (no { data } envelope); normalise so
  // screens keep reading `.data` and a future envelope would also keep working.
  list: async (): Promise<{ data: Payment[] }> => {
    const res = await apiRequest<Payment[] | { data: Payment[] }>('/payments');
    return { data: Array.isArray(res) ? res : res?.data ?? [] };
  },

  initiate: (
    data: {
      gateway: string;
      purpose: string;
      amountKobo: number;
      currency: string;
      description?: string;
      savePaymentMethod?: boolean;
      paymentMethodId?: string;
    },
    idempotencyKey?: string,
  ) =>
    apiRequest<{
      paymentId: string;
      authorizationUrl?: string;
      reference?: string;
      gateway: string;
      status?: string;
      requiresOtp?: boolean;
      flwRef?: string;
    }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    }),

  getGatewayStatus: () =>
    apiRequest<{ gateway: string; name: string; active: boolean; bankName?: string; accountNumber?: string; accountName?: string }[]>(
      '/payments/gateways/status'
    ),

  // Public endpoint; re-checks with the gateway so the app need not wait for the webhook.
  verify: (reference: string) =>
    apiRequest<{ status: string; paymentId: string; gateway: string }>(
      `/payments/verify?reference=${encodeURIComponent(reference)}`
    ),

  validateCharge: (data: { paymentId: string; flwRef: string; otp: string }) =>
    apiRequest<{ status: string; paymentId: string }>('/payments/validate-charge', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const paymentMethods = {
  list: () => apiRequest<PaymentMethod[]>('/payments/methods'),

  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/payments/methods/${id}`, { method: 'DELETE' }),

  setDefault: (id: string) =>
    apiRequest<{ ok: boolean }>(`/payments/methods/${id}/default`, { method: 'POST' }),
};

export const notifications = {
  list: () => apiRequest<{ data: Notification[] }>('/notifications'),

  markRead: (id: string) =>
    apiRequest<void>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiRequest<unknown>('/notifications/read-all', { method: 'PATCH' }),
};

export const telecare = {
  list: () => apiRequest<{ data: TelecareSession[] }>('/telecare/sessions'),

  get: (id: string) => apiRequest<{ data: TelecareSession }>(`/telecare/sessions/${id}`),

  getToken: (id: string) =>
    apiRequest<{ token: string; serverUrl: string; roomName: string }>(
      `/telecare/sessions/${id}/token`,
      { method: 'POST' }
    ),

  rate: (id: string, rating: number, feedback?: string) =>
    apiRequest<unknown>(`/telecare/sessions/${id}/rate`, {
      method: 'PATCH',
      body: JSON.stringify({ rating, ...(feedback && { feedback }) }),
    }),

  markCompleted: (id: string) =>
    apiRequest<{ id: string; status: string; endedAt: string | null }>(
      `/telecare/sessions/${id}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'completed', endedAt: new Date().toISOString() }) }
    ),
};

export type ShareAccessMode = 'public' | 'email_list' | 'password';

export interface RecordShare {
  id: string;
  label?: string | null;
  accessMode: ShareAccessMode;
  allowedEmails: string[];
  recordTypes: string[];
  expiresAt?: string | null;
  isRevoked: boolean;
  revokedAt?: string | null;
  detectForwarding: boolean;
  createdAt: string;
  _count: { accesses: number };
}

export interface CreateShareParams {
  label?: string;
  accessMode: 'email_list';
  allowedEmails: string[];
  recordTypes?: string[];
  expiresAt?: string;
  detectForwarding?: boolean;
  notifyRecipients?: boolean;
  recipientPhones?: string[];
}

export const shares = {
  create: (data: CreateShareParams) =>
    apiRequest<{ id: string; token: string; share: RecordShare; notified: { emails: number; phones: number } }>(
      '/shares',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  list: () => apiRequest<RecordShare[]>('/shares'),

  audit: (id: string) =>
    apiRequest<{ share: RecordShare; accesses: Array<{ id: string; action: string; visitorEmail?: string; occurredAt: string }> }>(
      `/shares/${id}/audit`
    ),

  revoke: (id: string) => apiRequest<RecordShare>(`/shares/${id}`, { method: 'DELETE' }),
};

export const support = {
  list: (status?: string) =>
    apiRequest<SupportTicket[]>(`/support/tickets${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  get: (id: string) => apiRequest<SupportTicket>(`/support/tickets/${id}`),

  create: (data: { subject: string; description: string; category?: string; priority?: string }) =>
    apiRequest<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addMessage: (id: string, message: string) =>
    apiRequest<SupportMessage>(`/support/tickets/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

export const dispatch = {
  create: (data: {
    emergencyType: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    locationAddress?: string;
    contactPhone?: string;
  }) =>
    apiRequest<{ data: unknown }>(
      '/dispatch',
      { method: 'POST', body: JSON.stringify(data) }
    ),
};

export interface NotificationPrefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  appointmentReminders: boolean;
  labResultAlerts: boolean;
  paymentReceipts: boolean;
  dispatchUpdates: boolean;
  expertReviewUpdates: boolean;
  marketingComms: boolean;
}

export const notificationPrefs = {
  get: () => apiRequest<{ data: NotificationPrefs }>('/auth/notification-preferences'),

  update: (prefs: Partial<NotificationPrefs>) =>
    apiRequest<{ data: NotificationPrefs }>('/auth/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }),
};

export type ConsentType = 'treatment' | 'data_sharing' | 'telecare' | 'research' | 'marketing' | 'analytics';

export interface ConsentRecord {
  id: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
}

export const consents = {
  // GET /consents returns a bare array (no envelope); normalise so screens read `.data`.
  list: async (): Promise<{ data: ConsentRecord[] }> => {
    const res = await apiRequest<ConsentRecord[] | { data: ConsentRecord[] }>('/consents');
    return { data: Array.isArray(res) ? res : res?.data ?? [] };
  },

  upsert: (data: { consentType: ConsentType; granted: boolean; version?: string }) =>
    apiRequest<{ data: ConsentRecord }>('/consents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface SubscriptionPlan {
  id: string;
  slug: string;
  tier: string;
  name: string;
  priceKobo: number;
  billingPeriod: string;
  features: string[];
  annualPriceKobo?: number;
  launchPriceKobo?: number;
  isMostPopular?: boolean;
  isBestValue?: boolean;
  bestFor?: string;
  noClaimPct?: number;
}

export interface ActiveSubscription {
  id: string;
  status: string;
  startedAt: string;
  // null = never expires (Free tier)
  expiresAt: string | null;
  autoRenew: boolean;
  plan: SubscriptionPlan;
}

export interface SubscriptionUpgradeResponse {
  requiresPayment: true;
  paymentId: string;
  gateway: string;
  authorizationUrl: string;
  /** Gateway reference; pass to payments.verify to learn the outcome. */
  reference?: string;
  amountKobo: number;
  currency: string;
}

export const subscriptions = {
  listPlans: () => apiRequest<{ data: SubscriptionPlan[] }>('/subscriptions/plans'),

  getMy: () => apiRequest<{ data: ActiveSubscription | null }>('/subscriptions/me'),

  // billingCycle must match backend BillingCycle enum: 'monthly' | 'quarterly' | 'annually'.
  // Free-tier only — paid upgrades must go through upgrade() so payment is collected first.
  subscribe: (planId: string, billingCycle: string) =>
    apiRequest<{ data: ActiveSubscription }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle }),
    }),

  // Patient-facing paid upgrade. Returns a gateway authorization URL to open;
  // the subscription activates via payment webhook once the gateway confirms.
  upgrade: (planId: string, billingCycle: string, gateway: 'Flutterwave' | 'Paystack' = 'Flutterwave') =>
    apiRequest<SubscriptionUpgradeResponse>('/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle, gateway }),
    }),

  cancel: (subscriptionId: string) =>
    apiRequest<{ message: string }>(`/subscriptions/${subscriptionId}`, { method: 'DELETE' }),
};

export type TravelSafeStatus = 'preparing' | 'active' | 'completed' | 'cancelled';

export interface TravelSafeTrip {
  id: string;
  patientId: string;
  partnerCode?: string;
  partnerName?: string;
  destinationCountry: string;
  departureDate: string;
  returnDate?: string;
  purpose?: string;
  status: TravelSafeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const travelsafe = {
  create: (data: {
    destinationCountry: string;
    departureDate: string;
    returnDate?: string;
    purpose?: string;
    notes?: string;
  }) =>
    apiRequest<{ data: TravelSafeTrip }>('/travelsafe/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () => apiRequest<{ data: TravelSafeTrip[] }>('/travelsafe/trips'),

  get: (id: string) => apiRequest<{ data: TravelSafeTrip }>(`/travelsafe/trips/${id}`),
};

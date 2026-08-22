/**
 * Central API client for Health Hub Africa Mobile
 * Direct native client to the NestJS backend (health-hub-africa-api)
 * Mirrors the typed surface of the web patient portal lib/api.ts
 */

import * as SecureStore from 'expo-secure-store';

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
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      'Unable to connect to Health Hub Africa. Please check your internet connection.'
    );
  }

  if (res.status === 401 && retryOnAuth) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) return apiRequest<T>(path, options, false);
    await clearStoredTokens();
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
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

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      if (data.refreshToken) await saveRefreshToken(data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
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
  rating?: number | null;
  isAvailable: boolean;
  profilePhotoUrl?: string | null;
  bio?: string | null;
  yearsExperience?: number | null;
  languages?: string[] | null;
}

export interface CreateAppointmentPayload {
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

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown> | null;
}

export interface TelecareSession {
  id: string;
  hhaRef: string;
  status: string;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  meetingUrl?: string | null;
  provider?: { firstName: string; lastName: string; title?: string | null } | null;
}

// ── API Namespaces ────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    apiRequest<{ accessToken: string; refreshToken: string } | { requiresTwoFactor: true; userId: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false
    ),

  register: (email: string, password: string, phoneNumber?: string, fullName?: string) =>
    apiRequest<{ message: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, phoneNumber, fullName }) },
      false
    ),

  verifyOtp: (email: string, otp: string, type = 'email') =>
    apiRequest<{ accessToken: string; refreshToken: string }>(
      '/auth/verify-otp',
      { method: 'POST', body: JSON.stringify({ email, otp, type }) },
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
  list: (params?: { status?: string; upcoming?: boolean }) => {
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

  create: (data: CreateAppointmentPayload) =>
    apiRequest<{ data: Appointment }>(
      '/appointments',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  cancel: (id: string, reason?: string) =>
    apiRequest<Appointment>(
      `/appointments/${id}/cancel`,
      { method: 'POST', body: JSON.stringify({ reason: reason ?? '' }) }
    ),
};

export const records = {
  list: (type?: string) => {
    const qs = type ? `?type=${encodeURIComponent(type)}` : '';
    return apiRequest<{ data: ClinicalRecord[]; meta: { total: number } }>(`/records${qs}`);
  },

  get: (id: string) => apiRequest<{ data: ClinicalRecord }>(`/records/${id}`),

  prescriptions: () => apiRequest<PrescriptionItem[]>('/records/prescriptions/list'),

  getStorageUsage: () => apiRequest<{ data: StorageUsage | null }>('/records/storage'),
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

export const payments = {
  list: () => apiRequest<{ data: Payment[] }>('/payments'),

  initiate: (data: {
    gateway: string;
    purpose: string;
    amountKobo: number;
    currency: string;
    description?: string;
    savePaymentMethod?: boolean;
    paymentMethodId?: string;
  }) =>
    apiRequest<{
      paymentId: string;
      authorizationUrl?: string;
      gateway: string;
      status?: string;
      requiresOtp?: boolean;
      flwRef?: string;
    }>('/payments', { method: 'POST', body: JSON.stringify(data) }),

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
    apiRequest<void>('/notifications/read-all', { method: 'POST' }),
};

export const telecare = {
  list: () => apiRequest<{ data: TelecareSession[] }>('/telecare/sessions'),

  get: (id: string) => apiRequest<{ data: TelecareSession }>(`/telecare/sessions/${id}`),

  getToken: (id: string) =>
    apiRequest<{ token: string; serverUrl: string; roomName: string }>(
      `/telecare/sessions/${id}/token`,
      { method: 'POST' }
    ),

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
  list: () => apiRequest<{ data: ConsentRecord[] }>('/consents'),

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
  upgrade: (planId: string, billingCycle: string, gateway: 'Flutterwave' = 'Flutterwave') =>
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

import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { randomBytes } from 'crypto';
import type { Redis } from 'ioredis';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  UpdateSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

export const OPENEMR_SYNC_QUEUE = 'openemr-sync';
export const OPENEMR_REDIS = Symbol('OPENEMR_REDIS');

const OPENEMR_SECRET_NAME = 'hha/openemr-refresh-token';

const REDIS_REFRESH_KEY = 'openemr:refresh_token';
const REDIS_STATE_PREFIX = 'openemr:oauth_state:';
const REDIS_PULL_CURSOR_PREFIX = 'openemr:pull-cursor:';
const STATE_TTL_SECONDS = 1800; // 30 minutes — generous enough to cover a slow click-through of OpenEMR's own login/consent screens

export type PullResourceType =
  | 'Observation'
  | 'MedicationRequest'
  | 'DocumentReference'
  | 'Encounter';

const ALLOWED_REDIRECT_URIS = new Set([
  'https://www.myvaultplus.com/auth/callback',
  'https://myvaultplus.com/auth/callback',
  'https://api.myvaultplus.com/api/v1/openemr/auth/callback',
]);

export interface SyncJobData {
  patientId: string;
  operation: 'create_patient' | 'update_patient' | 'sync_record' | 'sync_labs' | 'sync_provider';
  payload?: Record<string, unknown>;
}

@Injectable()
export class OpenemrService implements OnModuleInit {
  private readonly logger = new Logger(OpenemrService.name);
  private readonly secrets: SecretsManagerClient;
  readonly openemrBase: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(OPENEMR_SYNC_QUEUE) private readonly syncQueue: Queue<SyncJobData>,
    @Inject(OPENEMR_REDIS) private readonly redis: Redis,
  ) {
    this.openemrBase = config.getOrThrow('OPENEMR_BASE_URL');
    this.secrets = new SecretsManagerClient({ region: config.get('AWS_REGION', 'af-south-1') });
  }

  async onModuleInit() {
    await this.loadRefreshTokenFromRedis();

    // Clear and re-register all scheduled jobs so cron expressions stay consistent
    // across deployments without accumulating duplicate repeatables.
    const repeatableNames = new Set([
      'pull-lab-results',
      'pull-observations',
      'pull-medications',
      'pull-documents',
      'pull-encounters',
      'pull-appointments',
      'recover-unsynced',
    ]);
    const repeatables = await this.syncQueue.getRepeatableJobs();
    for (const r of repeatables.filter(j => repeatableNames.has(j.name))) {
      await this.syncQueue.removeRepeatableByKey(r.key);
    }

    await this.syncQueue.add(
      'pull-lab-results',
      { patientId: '', operation: 'sync_labs' },
      { repeat: { cron: '*/15 * * * *' }, removeOnComplete: 10 },
    );

    // Inbound FHIR pulls — clinical data authored in OpenEMR (vitals taken at
    // the clinic, e-prescriptions written by clinicians, scanned documents,
    // and finalised encounters) flows back into HHA so the patient portal
    // shows a complete record. Each handler uses a global Redis cursor
    // (`openemr:pull-cursor:{Resource}`) so it only fetches changes since
    // the last successful run.
    await this.syncQueue.add(
      'pull-observations',
      { patientId: '', operation: 'sync_record' },
      { repeat: { cron: '*/15 * * * *' }, removeOnComplete: 10 },
    );

    await this.syncQueue.add(
      'pull-medications',
      { patientId: '', operation: 'sync_record' },
      { repeat: { cron: '*/15 * * * *' }, removeOnComplete: 10 },
    );

    await this.syncQueue.add(
      'pull-documents',
      { patientId: '', operation: 'sync_record' },
      { repeat: { cron: '*/15 * * * *' }, removeOnComplete: 10 },
    );

    await this.syncQueue.add(
      'pull-encounters',
      { patientId: '', operation: 'sync_record' },
      { repeat: { cron: '*/15 * * * *' }, removeOnComplete: 10 },
    );

    // OpenEMR → HHA appointment flow-back. OpenEMR has no webhook system and
    // its legacy calendar UI bypasses FHIR event dispatchers, so changes made
    // by clinic staff (reschedules, cancellations, no-shows) are polled from
    // the REST calendar list and mirrored onto the HHA appointments we
    // originally pushed (matched by openemrAppointmentId / pc_eid). We poll
    // by event data rather than FHIR _lastUpdated, which OpenEMR computes
    // unreliably for Appointment resources.
    await this.syncQueue.add(
      'pull-appointments',
      { patientId: '', operation: 'sync_record' },
      { repeat: { cron: '*/15 * * * *' }, removeOnComplete: 10 },
    );

    // Scheduled recovery: every 30 minutes re-enqueue any patient whose sync
    // never completed (no openemrPatientUuid). This handles patients who joined
    // while OpenEMR was offline or whose Bull jobs exhausted retries.
    await this.syncQueue.add(
      'recover-unsynced',
      { patientId: '', operation: 'create_patient' },
      { repeat: { cron: '*/30 * * * *' }, removeOnComplete: 5 },
    );

    // One-time startup pass — catches patients missed before this deploy.
    await this.recoverUnsyncedPatients();
  }

  async recoverUnsyncedPatients(): Promise<{ enqueued: number }> {
    try {
      const unsynced = await this.prisma.patient.findMany({
        where: { openemrPatientUuid: null },
        select: { id: true },
        take: 200,
      });

      if (unsynced.length === 0) {
        this.logger.log('Recovery: all patients are synced to OpenEMR');
        return { enqueued: 0 };
      }

      this.logger.warn(`Recovery: re-enqueueing ${unsynced.length} patient(s) with no OpenEMR UUID`);

      for (let i = 0; i < unsynced.length; i++) {
        await this.syncQueue.add(
          'sync-patient',
          { patientId: unsynced[i].id, operation: 'create_patient' },
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            delay: i * 500,
          },
        );
      }

      return { enqueued: unsynced.length };
    } catch (err) {
      this.logger.error(`Recovery failed: ${err instanceof Error ? err.message : String(err)}`);
      return { enqueued: 0 };
    }
  }

  // ── Enqueue Sync Jobs ──────────────────────────────────────────────────────

  async enqueuePatientSync(patientId: string) {
    await this.syncQueue.add(
      'sync-patient',
      { patientId, operation: 'create_patient' },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
    this.logger.log(`Enqueued OpenEMR sync for patient ${patientId}`);
  }

  async enqueueEncounterSync(patientId: string, appointmentId: string) {
    await this.syncQueue.add(
      'sync-encounter',
      { patientId, operation: 'sync_record', payload: { appointmentId } },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  // Re-enqueues encounter sync for appointments that haven't yet been
  // confirmed to OpenEMR — used to recover from a stretch of 401s once
  // the auth or endpoint issue is fixed. We can't tell from the
  // appointment row alone whether an encounter already landed, but the
  // queue handler's call to /fhir/Encounter is idempotent enough for our
  // needs: OpenEMR will accept a duplicate POST and return a fresh
  // encounter id; admins can prune duplicates in the rare case.
  async recoverAppointmentEncounters(): Promise<{ enqueued: number }> {
    const candidates = await this.prisma.appointment.findMany({
      where: {
        status: { in: ['requested', 'confirmed', 'upcoming', 'in_progress', 'completed'] },
        patient: { openemrPatientUuid: { not: null } },
      },
      select: { id: true, patientId: true },
      take: 500,
    });

    let enqueued = 0;
    for (let i = 0; i < candidates.length; i++) {
      await this.syncQueue.add(
        'sync-encounter',
        { patientId: candidates[i].patientId, operation: 'sync_record', payload: { appointmentId: candidates[i].id } },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, delay: i * 300 },
      );
      enqueued++;
    }

    this.logger.log(`Recovery: re-enqueued ${enqueued} encounter sync job(s)`);
    return { enqueued };
  }

  // Re-enqueues calendar sync for every confirmed/upcoming appointment that
  // never got an openemrAppointmentId — the visible symptom of the OAuth
  // scope / "Enable OpenEMR Standard REST API" misconfiguration this method
  // exists to recover from. Run once that's fixed and re-authorized to
  // backfill the entire backlog in one shot, rather than waiting for each
  // appointment's next status change to re-trigger its own sync attempt.
  async recoverAppointmentCalendarSync(): Promise<{ enqueued: number }> {
    const candidates = await this.prisma.appointment.findMany({
      where: {
        status: { in: ['confirmed', 'upcoming'] },
        openemrAppointmentId: null,
        patient: { openemrPatientUuid: { not: null } },
      },
      select: { id: true, patientId: true },
      take: 500,
    });

    let enqueued = 0;
    for (let i = 0; i < candidates.length; i++) {
      await this.syncQueue.add(
        'sync-appointment-calendar',
        { patientId: candidates[i].patientId, operation: 'sync_record', payload: { appointmentId: candidates[i].id, action: 'upsert' } },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, delay: i * 300 },
      );
      enqueued++;
    }

    this.logger.log(`Recovery: re-enqueued ${enqueued} appointment calendar sync job(s)`);
    return { enqueued };
  }

  // Mirrors a confirmed booking onto the OpenEMR calendar (pc events) so the
  // provider sees it inside OpenEMR without checking the HHA dashboard.
  // action 'upsert' replaces any previous event (reschedule); 'cancel'
  // deletes it. Requires the api:oemr scope — failures land in
  // /admin/system/errors until the OpenEMR standard REST API is enabled.
  async enqueueAppointmentCalendarSync(
    patientId: string,
    appointmentId: string,
    action: 'upsert' | 'cancel',
  ) {
    await this.syncQueue.add(
      'sync-appointment-calendar',
      { patientId, operation: 'sync_record', payload: { appointmentId, action } },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async enqueueRecordSync(patientId: string, recordId: string) {
    await this.syncQueue.add(
      'sync-record',
      { patientId, operation: 'sync_record', payload: { recordId } },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async enqueueVitalsSync(patientId: string, vitalsId: string) {
    await this.syncQueue.add(
      'sync-vitals',
      { patientId, operation: 'sync_record', payload: { vitalsId } },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async enqueueProviderSync(providerId: string) {
    await this.syncQueue.add(
      'sync-provider',
      { patientId: providerId, operation: 'sync_provider' },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
    this.logger.log(`Enqueued OpenEMR sync for provider ${providerId}`);
  }

  async fetchPractitioners(): Promise<Array<{
    openemrId: string;
    firstName: string;
    lastName: string;
    title: string;
    email: string | null;
    specialty: string;
  }>> {
    const token = await this.getAccessToken();
    const response = await this.callOpenemr(token, 'GET', '/fhir/Practitioner?_count=200');

    const entries = (response.entry as Record<string, unknown>[] | undefined) ?? [];

    return entries.flatMap((entry) => {
      const resource = (entry.resource ?? {}) as Record<string, unknown>;
      const id = resource.id as string | undefined;
      if (!id) return [];

      const nameArr = (resource.name as Record<string, unknown>[] | undefined) ?? [];
      const name = (nameArr[0] ?? {}) as Record<string, unknown>;
      const given = (name.given as string[] | undefined) ?? [];
      const prefix = (name.prefix as string[] | undefined) ?? [];
      const telecom = (resource.telecom as Array<{ system: string; value: string }> | undefined) ?? [];
      const qualifications = (resource.qualification as Array<{ code?: { text?: string } }> | undefined) ?? [];

      const email = telecom.find((t) => t.system === 'email')?.value ?? null;

      return [{
        openemrId: id,
        firstName: given[0] ?? 'Unknown',
        lastName: (name.family as string | undefined) ?? 'Unknown',
        title: prefix[0] ?? '',
        email,
        specialty: qualifications[0]?.code?.text ?? 'General Practice',
      }];
    });
  }

  // Pulls every facility from OpenEMR via FHIR /fhir/Location. We use FHIR
  // (rather than the legacy /api/facility REST endpoint) because the OAuth
  // token we have grants api:fhir but not whatever scope api:oemr needs —
  // /api/facility returns 401 in prod, same problem encounter sync hit.
  // Encounter sync references Location/{id} so storing the FHIR id keeps
  // both ends of the round-trip consistent.
  async fetchFacilities(): Promise<Array<{
    openemrId: string;
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  }>> {
    const token = await this.getAccessToken();
    const response = await this.callOpenemr(token, 'GET', '/fhir/Location?_count=200');

    // FHIR bundle shape: { entry: [{ resource: { ... } }] }
    const entries = (response.entry as Array<Record<string, unknown>> | undefined) ?? [];

    return entries.flatMap((entry) => {
      const resource = (entry.resource ?? {}) as Record<string, unknown>;
      const id = resource.id as string | undefined;
      const name = resource.name as string | undefined;
      if (!id || !name) return [];

      // OpenEMR creates FHIR Location records for patient home addresses as well
      // as for real clinical facilities. Exclude them by physicalType code 'ho'
      // (FHIR home type) and by the literal name "Home Address" as a fallback for
      // builds that omit physicalType.
      const physicalType = resource.physicalType as { coding?: Array<{ code?: string }> } | undefined;
      const physicalCode = physicalType?.coding?.[0]?.code;
      if (physicalCode === 'ho') return [];
      if (name.trim().toLowerCase() === 'home address') return [];

      const telecom = (resource.telecom as Array<{ system: string; value: string }> | undefined) ?? [];
      const phone = telecom.find((t) => t.system === 'phone')?.value ?? null;

      const address = (resource.address ?? {}) as Record<string, unknown>;
      const lines = (address.line as string[] | undefined) ?? [];
      const street = lines[0] ?? null;
      const city = (address.city as string | undefined) ?? null;
      const state = (address.state as string | undefined) ?? null;

      return [{
        openemrId: id,
        name,
        phone,
        address: street,
        city,
        state,
      }];
    });
  }

  async enqueueLabOrderSync(patientId: string, labOrderId: string) {
    await this.syncQueue.add(
      'sync-labs',
      { patientId, operation: 'sync_labs', payload: { labOrderId } },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  // ── Sync Queue Items (for admin monitoring) ────────────────────────────────

  async findQueueItems() {
    return this.prisma.openemrSyncQueue.findMany({
      where: { status: { in: ['pending', 'failed'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async retryFailed(id: string) {
    const item = await this.prisma.openemrSyncQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Queue item not found');

    await this.prisma.openemrSyncQueue.update({
      where: { id },
      data: { status: 'pending', errorMessage: null, attempts: 0 },
    });

    await this.syncQueue.add(
      'retry',
      { patientId: item.patientId, operation: item.operation as SyncJobData['operation'] },
      { attempts: 3 },
    );

    return { message: 'Retry enqueued' };
  }

  // ── OpenEMR HTTP Helper ────────────────────────────────────────────────────

  protected async callOpenemr(
    token: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    patientId?: string,
    appointmentId?: string,
  ): Promise<Record<string, unknown>> {
    const isFhir = path.startsWith('/fhir');
    const url = `${this.openemrBase}/apis/default${path}`;

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': isFhir ? 'application/fhir+json' : 'application/json',
        Accept: isFhir ? 'application/fhir+json' : 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`OpenEMR ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);

      // GET 404s are routine existence checks (e.g. "does this patient exist?"),
      // not integration failures worth tracking in the error log. Everything
      // else — including 401/403/5xx on GETs and any non-GET failure — does
      // get logged so admins can see why a sync or import failed in
      // /system/errors.
      const isExistenceCheck404 = method === 'GET' && res.status === 404;
      if (!isExistenceCheck404) {
        await this.prisma.integrationError.create({
          data: {
            service: 'OpenEMR',
            endpoint: path,
            method,
            errorCode: String(res.status),
            errorMessage: text.slice(0, 500),
            patientId: patientId ?? null,
            appointmentId: appointmentId ?? null,
          },
        });
      }

      throw new Error(`OpenEMR ${res.status} on ${method} ${path}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<Record<string, unknown>>;
  }

  // ── Token Management — Authorization Code + Refresh Token ─────────────────
  //
  // OpenEMR only supports authorization_code and refresh_token grant types.
  // The initial token is obtained via a one-time admin authorization flow:
  //   1. Admin calls GET /openemr/auth/init to get the authorization URL
  //   2. Admin logs in to OpenEMR in a browser, gets redirected with ?code=...
  //   3. Admin calls POST /openemr/auth/exchange with the code
  //   4. Backend stores the refresh_token in Redis (fast) AND Secrets Manager
  //      (durable fallback) so it survives Redis flushes and ECS task replacements.
  //
  // After setup, access tokens are refreshed silently using the stored
  // refresh_token. The refresh_token is updated in both stores on every rotation.

  private cachedToken: { value: string; expiresAt: number } | null = null;
  private refreshToken: string | null = null;

  private get clientId(): string {
    return this.config.getOrThrow<string>('OPENEMR_CLIENT_ID');
  }

  private get clientSecret(): string {
    return this.config.getOrThrow<string>('OPENEMR_CLIENT_SECRET');
  }

  private get basicCredentials(): string {
    return Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
  }

  private get tokenUrl(): string {
    return `${this.openemrBase}/oauth2/default/token`;
  }

  private async loadRefreshTokenFromRedis(): Promise<void> {
    // Try Redis first (fast path)
    try {
      const stored = await this.redis.get(REDIS_REFRESH_KEY);
      if (stored) {
        this.refreshToken = stored;
        this.logger.log('OpenEMR refresh token loaded from Redis');
        return;
      }
    } catch (err) {
      this.logger.error(`Failed to read OpenEMR refresh token from Redis: ${err}`);
    }

    // Fallback: load from Secrets Manager (survives Redis flushes / ECS replacements)
    try {
      const result = await this.secrets.send(
        new GetSecretValueCommand({ SecretId: OPENEMR_SECRET_NAME }),
      );
      const parsed = JSON.parse(result.SecretString ?? '{}') as { refresh_token?: string };
      if (parsed.refresh_token) {
        this.refreshToken = parsed.refresh_token;
        // Warm up Redis so future startups stay on the fast path
        await this.redis.set(REDIS_REFRESH_KEY, parsed.refresh_token).catch(() => null);
        this.logger.log('OpenEMR refresh token restored from Secrets Manager');
      } else {
        this.logger.warn(
          'No OpenEMR refresh token found. ' +
          'Complete one-time setup: GET /openemr/auth/init → visit URL → POST /openemr/auth/exchange',
        );
      }
    } catch (err) {
      this.logger.error(`Failed to load OpenEMR refresh token from Secrets Manager: ${err}`);
    }
  }

  private async saveRefreshToken(token: string): Promise<void> {
    this.refreshToken = token;

    // Persist to Redis (fast, used by all running containers)
    try {
      await this.redis.set(REDIS_REFRESH_KEY, token);
    } catch (err) {
      this.logger.error(`Failed to persist OpenEMR refresh token to Redis: ${err}`);
    }

    // Persist to Secrets Manager (durable fallback across Redis restarts / ECS replacements)
    try {
      await this.secrets.send(
        new UpdateSecretCommand({
          SecretId: OPENEMR_SECRET_NAME,
          SecretString: JSON.stringify({ refresh_token: token }),
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to persist OpenEMR refresh token to Secrets Manager: ${err}`);
    }
  }

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60_000) {
      return this.cachedToken.value;
    }

    if (!this.refreshToken) {
      throw new Error(
        'OpenEMR not authenticated. Complete the OAuth2 setup: ' +
        'GET /openemr/auth/init then POST /openemr/auth/exchange',
      );
    }

    return this.refreshAccessToken();
  }

  private async refreshAccessToken(): Promise<string> {
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${this.basicCredentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken!,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`OpenEMR token refresh failed [${res.status}]: ${text.slice(0, 300)}`);

      // Before clearing, check whether Redis has a fresher token than what we tried.
      // This can happen when a deployment or diagnostic script rotated the token
      // externally — the in-memory value is stale but Redis is still valid.
      try {
        const redisToken = await this.redis.get(REDIS_REFRESH_KEY);
        if (redisToken && redisToken !== this.refreshToken) {
          this.logger.warn('Stale in-memory refresh token detected; falling back to Redis token on next attempt');
          this.refreshToken = redisToken;
          // Do NOT delete Redis — the caller (Bull job retry) will re-enter and use the fresher token.
          throw new Error(
            `OpenEMR refresh failed with stale token (${res.status}). Retrying with Redis token.`,
          );
        }
      } catch (redisErr: unknown) {
        if (redisErr instanceof Error && redisErr.message.startsWith('OpenEMR refresh failed with stale token')) {
          throw redisErr;
        }
        this.logger.error(`Redis fallback check failed: ${redisErr}`);
      }

      this.refreshToken = null;
      try { await this.redis.del(REDIS_REFRESH_KEY); } catch { /* ignore */ }

      throw new Error(
        `OpenEMR refresh failed (${res.status}). Re-authenticate via POST /openemr/auth/exchange`,
      );
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    this.cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    if (data.refresh_token) {
      await this.saveRefreshToken(data.refresh_token);
    }

    this.logger.log('OpenEMR access token refreshed');
    return this.cachedToken.value;
  }

  // ── One-time Auth Setup ────────────────────────────────────────────────────

  async buildAuthorizationUrl(redirectUri: string): Promise<{ authorizationUrl: string; state: string }> {
    if (!ALLOWED_REDIRECT_URIS.has(redirectUri)) {
      throw new BadRequestException(`redirect_uri not in allowlist: ${redirectUri}`);
    }

    const state = randomBytes(32).toString('base64url');
    await this.redis.set(`${REDIS_STATE_PREFIX}${state}`, '1', 'EX', STATE_TTL_SECONDS);

    const scope = [
      'openid',
      'api:oemr',
      'api:fhir',
      'user/Patient.read',
      'user/Patient.write',
      'user/Observation.read',
      'user/Observation.write',
      'user/DocumentReference.read',
      'user/DocumentReference.write',
      'user/ServiceRequest.read',
      'user/ServiceRequest.write',
      'user/MedicationRequest.read',
      'user/MedicationRequest.write',
      'user/Practitioner.read',
      'user/Practitioner.write',
      'user/Encounter.read',
      'user/Encounter.write',
      'user/Appointment.read',
      'user/Appointment.write',
      'user/Location.read',
      'user/Location.write',
      'user/Organization.read',
      'user/Organization.write',
      // Standard REST API scopes. OpenEMR's /api/* routes are gated by these
      // lowercase resource scopes, NOT by the PascalCase FHIR scopes above —
      // api:oemr alone is only the base scope. Without them every calendar
      // write (POST /api/patient/{uuid}/appointment), the pc_aid lookup
      // (GET /api/practitioner) and the REST encounter fallback return 401.
      // On this OpenEMR build FHIR Appointment is read-only, so the REST
      // calendar endpoint is the only appointment write path.
      'user/appointment.read',
      'user/appointment.write',
      'user/appointment.cruds',
      'user/practitioner.read',
      'user/encounter.read',
      'user/encounter.write',
      // Lab-results pull (GET /fhir/DiagnosticReport) — FHIR read scope that
      // was never in the original list; without it the pull 401s as soon as
      // a lab order goes pending.
      'user/DiagnosticReport.read',
      // Future-proofing: this OpenEMR build has no FHIR write support for
      // MedicationRequest / DocumentReference / Observation (the server's
      // scopes_supported only offers lowercase Standard-API writes for
      // these), so prescription, document and vitals pushes will need REST
      // fallbacks like the encounter one. Scopes are only granted at the
      // one-time admin re-auth, so request them now to avoid a second
      // re-auth ceremony when those fallbacks land.
      'user/medication.cruds',
      'user/document.crs',
      'user/vital.crus',
      'offline_access',
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    });

    return {
      authorizationUrl: `${this.openemrBase}/oauth2/default/authorize?${params.toString()}`,
      state,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    state: string,
  ): Promise<{ message: string; grantedScope: string | null }> {
    if (!ALLOWED_REDIRECT_URIS.has(redirectUri)) {
      throw new BadRequestException(`redirect_uri not in allowlist: ${redirectUri}`);
    }

    const stateKey = `${REDIS_STATE_PREFIX}${state}`;
    let storedState: string | null;
    try {
      storedState = await this.redis.get(stateKey);
    } catch (err) {
      // Distinguish "the lookup itself failed" (Redis connectivity, e.g. a
      // deploy rollover mid-flow) from "the state genuinely isn't there"
      // (expired or already consumed) — both used to collapse into the same
      // generic "invalid or expired" message, which made a transient Redis
      // blip indistinguishable from a real expiry when reading the logs.
      this.logger.error(
        `OAuth state lookup failed for key ${stateKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new Error('OpenEMR OAuth state lookup failed (Redis error) — check API logs and retry GET /openemr/auth/init');
    }
    if (!storedState) {
      throw new BadRequestException('Invalid or expired OAuth state. Start over with GET /openemr/auth/init');
    }
    await this.redis.del(stateKey);

    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${this.basicCredentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`OpenEMR code exchange failed [${res.status}]: ${text.slice(0, 300)}`);
      throw new Error(`Code exchange failed: ${res.status} — ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    };

    this.cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    if (data.refresh_token) {
      await this.saveRefreshToken(data.refresh_token);
      this.logger.log('OpenEMR OAuth2 setup complete — refresh token stored');
    }

    this.logger.log(`OpenEMR granted scope: ${data.scope ?? '(not returned by token endpoint)'}`);

    return {
      message: 'OpenEMR authentication successful. Refresh token stored.',
      grantedScope: data.scope ?? null,
    };
  }

  get isAuthenticated(): boolean {
    return !!this.refreshToken;
  }

  // ── Pull Cursors ───────────────────────────────────────────────────────────
  //
  // Tracks the high-water mark per FHIR resource type so subsequent pulls only
  // ask OpenEMR for records changed since the last successful pull
  // (`_lastUpdated=gt{cursor}`). Cursors are global (not per-patient) — new
  // patients have no prior OpenEMR history to backfill since the patient
  // record itself was just pushed from HHA.

  async getPullCursor(resource: PullResourceType): Promise<string | null> {
    try {
      return await this.redis.get(`${REDIS_PULL_CURSOR_PREFIX}${resource}`);
    } catch (err) {
      this.logger.error(`Failed to read pull cursor for ${resource}: ${err}`);
      return null;
    }
  }

  async setPullCursor(resource: PullResourceType, iso: string): Promise<void> {
    try {
      await this.redis.set(`${REDIS_PULL_CURSOR_PREFIX}${resource}`, iso);
    } catch (err) {
      this.logger.error(`Failed to persist pull cursor for ${resource}: ${err}`);
    }
  }

  // Exposed for the processor — internal callers should use the typed helpers
  // (fetchPractitioners, enqueue*). Returns the raw FHIR JSON response.
  async fhirCall(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    patientId?: string,
  ): Promise<Record<string, unknown>> {
    const token = await this.getAccessToken();
    return this.callOpenemr(token, method, path, body, patientId);
  }
}

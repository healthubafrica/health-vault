import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

export const OPENEMR_SYNC_QUEUE = 'openemr-sync';

export interface SyncJobData {
  patientId: string;
  operation: 'create_patient' | 'update_patient' | 'sync_record' | 'sync_labs' | 'sync_provider';
  payload?: Record<string, unknown>;
}

@Injectable()
export class OpenemrService implements OnModuleInit {
  private readonly logger = new Logger(OpenemrService.name);
  readonly openemrBase: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(OPENEMR_SYNC_QUEUE) private readonly syncQueue: Queue<SyncJobData>,
  ) {
    this.openemrBase = config.getOrThrow('OPENEMR_BASE_URL');
  }

  async onModuleInit() {
    const repeatables = await this.syncQueue.getRepeatableJobs();
    for (const r of repeatables.filter(j => j.name === 'pull-lab-results')) {
      await this.syncQueue.removeRepeatableByKey(r.key);
    }
    await this.syncQueue.add(
      'pull-lab-results',
      { patientId: '', operation: 'sync_labs' },
      { repeat: { cron: '*/15 * * * *' }, removeOnComplete: 10 },
    );
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

  async enqueueLabOrderSync(patientId: string, labOrderId: string) {
    await this.syncQueue.add(
      'sync-labs',
      { patientId, operation: 'sync_labs', payload: { labOrderId } },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  // ── Sync Queue Items (for admin monitoring) ────────────────────────────────

  async findQueueItems(currentUser: JwtPayload) {
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

      await this.prisma.integrationError.create({
        data: {
          service: 'OpenEMR',
          endpoint: path,
          method,
          errorCode: String(res.status),
          errorMessage: text.slice(0, 500),
          patientId: patientId ?? null,
        },
      });

      throw new Error(`OpenEMR ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<Record<string, unknown>>;
  }

  // ── Token Management — Password Grant + Refresh Token Rotation ─────────────
  //
  // The OpenEMR OAuth2 app is registered as an authorization_code confidential
  // client. For server-to-server access we use the password grant (ROPC) with
  // a dedicated service account on first auth, then rotate via refresh_token so
  // the credentials aren't re-sent on every request.
  //
  // Required env vars:
  //   OPENEMR_CLIENT_ID      — OAuth2 client ID
  //   OPENEMR_CLIENT_SECRET  — OAuth2 client secret
  //   OPENEMR_USERNAME       — OpenEMR service account username
  //   OPENEMR_PASSWORD       — OpenEMR service account password

  private cachedToken: { value: string; expiresAt: number } | null = null;
  private refreshToken: string | null = null;

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60_000) {
      return this.cachedToken.value;
    }

    if (this.refreshToken) {
      try {
        return await this.refreshAccessToken();
      } catch {
        this.refreshToken = null;
        this.logger.warn('OpenEMR refresh token expired; falling back to password grant');
      }
    }

    return this.fetchTokenWithPassword();
  }

  private async fetchTokenWithPassword(): Promise<string> {
    const clientId     = this.config.getOrThrow<string>('OPENEMR_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('OPENEMR_CLIENT_SECRET');
    const username     = this.config.getOrThrow<string>('OPENEMR_USERNAME');
    const password     = this.config.getOrThrow<string>('OPENEMR_PASSWORD');
    const tokenUrl     = `${this.openemrBase}/oauth2/default/token`;

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
      'offline_access',
    ].join(' ');

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username,
        password,
        scope,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`OpenEMR password grant failed [${res.status}]: ${text.slice(0, 300)}`);
      throw new Error(`OpenEMR token fetch failed: ${res.status} — ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    this.cachedToken = {
      value:     data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }

    this.logger.log('OpenEMR access token obtained via password grant');
    return this.cachedToken.value;
  }

  private async refreshAccessToken(): Promise<string> {
    const clientId     = this.config.getOrThrow<string>('OPENEMR_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('OPENEMR_CLIENT_SECRET');
    const tokenUrl     = `${this.openemrBase}/oauth2/default/token`;
    const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: this.refreshToken!,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`OpenEMR refresh token failed [${res.status}]: ${text.slice(0, 300)}`);
      throw new Error(`Refresh failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    this.cachedToken = {
      value:     data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }

    this.logger.log('OpenEMR access token refreshed');
    return this.cachedToken.value;
  }
}

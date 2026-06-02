import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

export const OPENEMR_SYNC_QUEUE = 'openemr-sync';

export interface SyncJobData {
  patientId: string;
  operation: 'create_patient' | 'update_patient' | 'sync_record' | 'sync_labs';
  payload?: Record<string, unknown>;
}

@Injectable()
export class OpenemrService {
  private readonly logger = new Logger(OpenemrService.name);
  private readonly openemrBase: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(OPENEMR_SYNC_QUEUE) private readonly syncQueue: Queue<SyncJobData>,
  ) {
    this.openemrBase = config.getOrThrow('OPENEMR_BASE_URL');
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

  async enqueueRecordSync(patientId: string, recordId: string) {
    await this.syncQueue.add(
      'sync-record',
      { patientId, operation: 'sync_record', payload: { recordId } },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  // ── Sync Queue Item (for admin monitoring) ────────────────────────────────

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
      data: { status: 'pending', errorMessage: null, attemptCount: 0 },
    });

    await this.syncQueue.add(
      'retry',
      { patientId: item.patientId, operation: item.operation as SyncJobData['operation'] },
      { attempts: 3 },
    );

    return { message: 'Retry enqueued' };
  }

  // ── OpenEMR Proxy (frontend → HHA → OpenEMR, never direct) ───────────────

  async getPatientFromOpenemr(openemrUuid: string): Promise<Record<string, unknown>> {
    const token = await this.getAccessToken();
    const url = `${this.openemrBase}/apis/default/api/patient/${openemrUuid}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!res.ok) {
      this.logger.error(`OpenEMR GET /patient/${openemrUuid} → ${res.status}`);
      throw new Error(`OpenEMR error: ${res.status}`);
    }

    return res.json() as Promise<Record<string, unknown>>;
  }

  // ── Token Management ───────────────────────────────────────────────────────

  private cachedToken: { value: string; expiresAt: number } | null = null;

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 30_000) {
      return this.cachedToken.value;
    }

    const clientId = this.config.getOrThrow('OPENEMR_CLIENT_ID');
    const clientSecret = this.config.getOrThrow('OPENEMR_CLIENT_SECRET');
    const tokenUrl = `${this.openemrBase}/oauth2/default/token`;

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'openid api:oemr api:fhir',
      }),
    });

    if (!res.ok) throw new Error(`OpenEMR token fetch failed: ${res.status}`);

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return this.cachedToken.value;
  }
}

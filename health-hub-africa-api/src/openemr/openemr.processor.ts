import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { OpenemrService, OPENEMR_SYNC_QUEUE, SyncJobData } from './openemr.service';

@Processor(OPENEMR_SYNC_QUEUE)
export class OpenemrProcessor {
  private readonly logger = new Logger(OpenemrProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openemrService: OpenemrService,
  ) {}

  @Process({ name: 'sync-patient', concurrency: 2 })
  async handleSyncPatient(job: Job<SyncJobData>) {
    const { patientId, operation } = job.data;
    this.logger.log(`Processing ${operation} for patient ${patientId}`);

    const queueItem = await this.prisma.openemrSyncQueue.create({
      data: { patientId, operation, status: 'processing' },
    });

    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: { user: { select: { email: true, phone: true } } },
      });

      if (!patient) throw new Error(`Patient ${patientId} not found`);

      // Sync to OpenEMR (create or update)
      const openemrResult = await this.openemrService.getPatientFromOpenemr(
        patient.openemrPatientUuid ?? '',
      ).catch(() => null);

      // If not found in OpenEMR, we'd POST to create; else PATCH to update
      // Full implementation would call OpenEMR's patient create/update endpoint here

      await this.prisma.patient.update({
        where: { id: patientId },
        data: { openemrSyncStatus: 'synced' },
      });

      await this.prisma.openemrSyncQueue.update({
        where: { id: queueItem.id },
        data: { status: 'completed', processedAt: new Date() },
      });

      this.logger.log(`Sync complete for patient ${patientId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sync failed for patient ${patientId}: ${message}`);

      await this.prisma.openemrSyncQueue.update({
        where: { id: queueItem.id },
        data: {
          status: job.attemptsMade >= (job.opts.attempts ?? 3) - 1 ? 'failed' : 'pending',
          errorMessage: message,
          attemptCount: { increment: 1 },
        },
      });

      throw error; // Re-throw so Bull retries
    }
  }

  @Process({ name: 'sync-record' })
  async handleSyncRecord(job: Job<SyncJobData>) {
    const { patientId, payload } = job.data;
    this.logger.log(`Syncing record ${payload?.recordId} for patient ${patientId}`);
    // Implementation: POST clinical document to OpenEMR FHIR endpoint
  }

  @Process({ name: 'retry' })
  async handleRetry(job: Job<SyncJobData>) {
    return this.handleSyncPatient(job);
  }
}

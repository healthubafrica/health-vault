import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Gender } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenemrService, OPENEMR_SYNC_QUEUE, SyncJobData } from './openemr.service';

function mapGender(g: Gender): string {
  const map: Record<string, string> = {
    Male: 'Male',
    Female: 'Female',
    Other: 'Unknown',
    Prefer_not_to_say: 'Unknown',
  };
  return map[g] ?? 'Unknown';
}

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
      data: { patientId, operation, status: 'processing', payload: {} },
    });

    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        include: { user: { select: { email: true, phone: true } } },
      });

      if (!patient) throw new Error(`Patient ${patientId} not found`);

      const token = await this.openemrService.getAccessToken();

      // Check if already exists in OpenEMR
      const existing = patient.openemrPatientUuid
        ? await this.openemrService['callOpenemr'](token, 'GET', `/api/patient/${patient.openemrPatientUuid}`, undefined, patientId).catch(() => null)
        : null;

      const body: Record<string, string> = {
        fname: patient.firstName,
        lname: patient.lastName,
        DOB: patient.dateOfBirth.toISOString().split('T')[0],
        sex: mapGender(patient.gender),
        phone_cell: patient.user.phone ?? '',
        email: patient.user.email,
        street: patient.address ?? '',
        city: patient.city ?? '',
        state: patient.state ?? '',
        country_code: patient.country,
      };

      let openemrUuid: string;
      if (!existing) {
        const created = await this.openemrService['callOpenemr'](token, 'POST', '/api/patient', body, patientId);
        openemrUuid = ((created as Record<string, unknown>).data as Record<string, string>).uuid;
      } else {
        await this.openemrService['callOpenemr'](token, 'PUT', `/api/patient/${patient.openemrPatientUuid}`, body, patientId);
        openemrUuid = patient.openemrPatientUuid!;
      }

      await this.prisma.patient.update({
        where: { id: patientId },
        data: { openemrPatientUuid: openemrUuid, openemrSyncStatus: 'synced' },
      });

      await this.prisma.openemrSyncQueue.update({
        where: { id: queueItem.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      this.logger.log(`Sync complete for patient ${patientId} → OpenEMR UUID: ${openemrUuid}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sync failed for patient ${patientId}: ${message}`);

      const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 3) - 1;

      await this.prisma.openemrSyncQueue.update({
        where: { id: queueItem.id },
        data: {
          status: isFinalAttempt ? 'failed' : 'pending',
          errorMessage: message,
          attempts: { increment: 1 },
          lastAttemptedAt: new Date(),
        },
      });

      throw error;
    }
  }

  @Process({ name: 'sync-encounter' })
  async handleSyncEncounter(job: Job<SyncJobData>) {
    const { patientId, payload } = job.data;
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: payload!.appointmentId as string },
      include: { patient: true, provider: true },
    });

    if (!appointment || !appointment.patient.openemrPatientUuid) {
      this.logger.warn(`Skipping encounter sync — patient ${patientId} not yet synced to OpenEMR`);
      return;
    }

    const token = await this.openemrService.getAccessToken();
    const encounter = await this.openemrService['callOpenemr'](
      token, 'POST',
      `/api/patient/${appointment.patient.openemrPatientUuid}/encounter`,
      {
        date: appointment.scheduledAt.toISOString().split('T')[0],
        onset_date: appointment.scheduledAt.toISOString().split('T')[0],
        reason: appointment.reason ?? 'Scheduled Visit',
        facility_id: '1',
      },
      patientId,
    );

    this.logger.log(`Encounter created for patient ${patientId}: eid=${(encounter as Record<string, Record<string, unknown>>).data?.eid}`);
  }

  @Process({ name: 'sync-record' })
  async handleSyncRecord(job: Job<SyncJobData>) {
    const { patientId, payload } = job.data;
    this.logger.log(`Syncing record ${payload?.recordId} for patient ${patientId}`);
    // Push clinical document to OpenEMR FHIR DocumentReference — see integration.md §5.3
  }

  @Process({ name: 'sync-vitals' })
  async handleSyncVitals(job: Job<SyncJobData>) {
    const { patientId, payload } = job.data;
    this.logger.log(`Syncing vitals ${payload?.vitalsId} for patient ${patientId}`);
    // Push vitals bundle to OpenEMR FHIR Observation — see integration.md §5.6
  }

  @Process({ name: 'pull-lab-results' })
  async handlePullLabResults() {
    const patientsWithPending = await this.prisma.patient.findMany({
      where: {
        openemrPatientUuid: { not: null },
        labOrders: { some: { overallStatus: 'pending' } },
      },
      take: 50,
    });

    for (const patient of patientsWithPending) {
      try {
        const token = await this.openemrService.getAccessToken();
        const bundle = await this.openemrService['callOpenemr'](
          token, 'GET',
          `/fhir/DiagnosticReport?patient=${patient.openemrPatientUuid}&status=final`,
        );
        const entries = ((bundle as Record<string, unknown>).entry ?? []) as Array<{ resource: Record<string, unknown> }>;
        this.logger.log(`Pulled ${entries.length} lab reports for patient ${patient.id}`);
        // TODO: upsert into LabResult — see integration.md §5.4
      } catch (err: unknown) {
        this.logger.error(`Lab pull failed for patient ${patient.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  @Process({ name: 'retry' })
  async handleRetry(job: Job<SyncJobData>) {
    return this.handleSyncPatient(job);
  }
}

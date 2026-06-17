import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Gender, RecordType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenemrService, OPENEMR_SYNC_QUEUE, SyncJobData } from './openemr.service';

// ── FHIR helper types ─────────────────────────────────────────────────────────

interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

interface FhirDiagnosticReport {
  resourceType: string;
  id?: string;
  status?: string;
  code?: FhirCodeableConcept;
  subject?: { reference?: string };
  issued?: string;
  result?: Array<{ reference?: string; display?: string }>;
  conclusion?: string;
  conclusionCode?: FhirCodeableConcept[];
}

// ── Lookup tables ─────────────────────────────────────────────────────────────

const VITALS_LOINC: Record<string, { code: string; unit: string }> = {
  heartRate:    { code: '8867-4',  unit: '/min' },
  systolicBp:   { code: '8480-6',  unit: 'mm[Hg]' },
  diastolicBp:  { code: '8462-4',  unit: 'mm[Hg]' },
  spo2:         { code: '2708-6',  unit: '%' },
  weightKg:     { code: '29463-7', unit: 'kg' },
  heightCm:     { code: '8302-2',  unit: 'cm' },
  temperatureC: { code: '8310-5',  unit: 'Cel' },
  bloodGlucose: { code: '2339-0',  unit: 'mg/dL' },
  hba1c:        { code: '4548-4',  unit: '%' },
  haemoglobin:  { code: '718-7',   unit: 'g/dL' },
  wbc:          { code: '6690-2',  unit: '10*3/uL' },
  rbc:          { code: '789-8',   unit: '10*6/uL' },
  platelets:    { code: '777-3',   unit: '10*3/uL' },
};

const RECORD_TYPE_LOINC: Record<string, string> = {
  visit:         '11488-4',
  prescription:  '57833-6',
  lab:           '11502-2',
  imaging:       '18748-4',
  document:      '34133-9',
  referral:      '57133-1',
  expert_review: '11488-4',
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

function mapGender(g: Gender): string {
  const map: Record<string, string> = {
    Male:              'male',
    Female:            'female',
    Other:             'other',
    Prefer_not_to_say: 'unknown',
  };
  return map[g] ?? 'unknown';
}

function buildFhirPatient(
  patient: {
    firstName: string;
    lastName: string;
    middleName?: string | null;
    dateOfBirth: Date;
    gender: Gender;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country: string;
    hhaPatientId: string;
    user: { email: string; phone?: string | null };
  },
): Record<string, unknown> {
  const telecom: Array<Record<string, string>> = [];
  if (patient.user.phone) {
    telecom.push({ system: 'phone', use: 'mobile', value: patient.user.phone });
  }
  telecom.push({ system: 'email', value: patient.user.email });

  const given = [patient.firstName];
  if (patient.middleName) given.push(patient.middleName);

  return {
    resourceType: 'Patient',
    identifier: [{ system: 'https://myvaultplus.com/patients', value: patient.hhaPatientId }],
    name: [{ use: 'official', family: patient.lastName, given }],
    birthDate: patient.dateOfBirth.toISOString().split('T')[0],
    gender: mapGender(patient.gender),
    telecom,
    address: [{
      use: 'home',
      line: patient.address ? [patient.address] : [],
      city: patient.city ?? '',
      state: patient.state ?? '',
      country: patient.country,
    }],
  };
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && 'toNumber' in (v as object)) {
    return (v as { toNumber(): number }).toNumber();
  }
  const n = Number(v);
  return isNaN(n) ? null : n;
}

interface FhirBundleEntry {
  resource: Record<string, unknown>;
  request: { method: string; url: string };
}

function buildVitalsBundleEntries(
  reading: Record<string, unknown>,
  openemrPatientUuid: string,
  recordedAt: Date,
): FhirBundleEntry[] {
  const entries: FhirBundleEntry[] = [];

  for (const [field, loinc] of Object.entries(VITALS_LOINC)) {
    const value = toNum(reading[field]);
    if (value === null) continue;

    entries.push({
      resource: {
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
              },
            ],
          },
        ],
        code: {
          coding: [{ system: 'http://loinc.org', code: loinc.code }],
        },
        subject: { reference: `Patient/${openemrPatientUuid}` },
        effectiveDateTime: recordedAt.toISOString(),
        valueQuantity: {
          value,
          unit: loinc.unit,
          system: 'http://unitsofmeasure.org',
          code: loinc.unit,
        },
      },
      request: { method: 'POST', url: 'Observation' },
    });
  }

  return entries;
}

// ── Processor ─────────────────────────────────────────────────────────────────

@Processor(OPENEMR_SYNC_QUEUE)
export class OpenemrProcessor {
  private readonly logger = new Logger(OpenemrProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openemrService: OpenemrService,
  ) {}

  // ── Patient ──────────────────────────────────────────────────────────────

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

      const existing = patient.openemrPatientUuid
        ? await this.openemrService['callOpenemr'](
            token, 'GET', `/fhir/Patient/${patient.openemrPatientUuid}`, undefined, patientId,
          ).catch(() => null)
        : null;

      const fhirPatient = buildFhirPatient(patient);

      let openemrUuid: string;
      if (!existing) {
        // Search by HHA identifier first to avoid duplicates if a previous sync
        // completed the POST but failed to save the UUID (e.g. unexpected response shape).
        const searchBundle = await this.openemrService['callOpenemr'](
          token, 'GET',
          `/fhir/Patient?identifier=${encodeURIComponent(`https://myvaultplus.com/patients|${patient.hhaPatientId}`)}`,
          undefined, patientId,
        ).catch(() => null);
        const existingByIdentifier = (searchBundle as Record<string, unknown> | null)?.entry as Array<{ resource: Record<string, unknown> }> | undefined;
        const foundEntry = existingByIdentifier?.[0]?.resource;

        // OpenEMR returns the FHIR-standard `id` on GET but its own `uuid` key on POST.
        const foundUuid = (foundEntry?.id ?? foundEntry?.uuid) as string | undefined;
        if (foundUuid) {
          openemrUuid = foundUuid;
          this.logger.log(`Patient ${patientId} already in OpenEMR (found by identifier), UUID: ${openemrUuid}`);
        } else {
          const created = await this.openemrService['callOpenemr'](token, 'POST', '/fhir/Patient', fhirPatient, patientId);
          const raw = created as Record<string, unknown>;
          // OpenEMR FHIR POST returns { pid, uuid } rather than a standard FHIR Patient resource.
          openemrUuid = (raw.uuid ?? raw.id) as string;
          if (!openemrUuid) {
            this.logger.error(`OpenEMR POST /fhir/Patient returned no uuid/id. Response: ${JSON.stringify(created).slice(0, 500)}`);
            throw new Error(`OpenEMR FHIR Patient POST returned no uuid field. Check logs for response shape.`);
          }
        }
      } else {
        await this.openemrService['callOpenemr'](
          token, 'PUT', `/fhir/Patient/${patient.openemrPatientUuid}`,
          { ...fhirPatient, id: patient.openemrPatientUuid },
          patientId,
        );
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

      this.logger.log(`Patient ${patientId} synced → OpenEMR UUID: ${openemrUuid}`);
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

  // ── Encounter ────────────────────────────────────────────────────────────

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
        date:        appointment.scheduledAt.toISOString().split('T')[0],
        onset_date:  appointment.scheduledAt.toISOString().split('T')[0],
        reason:      appointment.reason ?? 'Scheduled Visit',
        facility_id: '1',
      },
      patientId,
    );

    this.logger.log(`Encounter created for patient ${patientId}: eid=${(encounter as Record<string, Record<string, unknown>>).data?.eid}`);
  }

  // ── Clinical Record / Prescription ───────────────────────────────────────

  @Process({ name: 'sync-record' })
  async handleSyncRecord(job: Job<SyncJobData>) {
    const { patientId, payload } = job.data;
    const record = await this.prisma.clinicalRecord.findUnique({
      where: { id: payload!.recordId as string },
      include: { patient: true, prescription: true },
    });

    if (!record || !record.patient.openemrPatientUuid) {
      this.logger.warn(`Skipping record sync — patient ${patientId} not yet synced to OpenEMR`);
      return;
    }

    const token = await this.openemrService.getAccessToken();
    const openemrUuid = record.patient.openemrPatientUuid;

    if (record.recordType === RecordType.prescription && record.prescription) {
      const rx = record.prescription;
      await this.openemrService['callOpenemr'](
        token, 'POST', '/fhir/MedicationRequest',
        {
          resourceType: 'MedicationRequest',
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: { text: rx.drugName },
          subject: { reference: `Patient/${openemrUuid}` },
          authoredOn: record.createdAt.toISOString(),
          dosageInstruction: [
            {
              text: `${rx.dosage} ${rx.frequency} via ${rx.route}`,
              timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } },
              route: { text: rx.route },
              doseAndRate: [{ doseQuantity: { value: 1, unit: rx.dosage } }],
            },
          ],
          dispenseRequest: {
            numberOfRepeatsAllowed: rx.refillsRemaining,
            ...(rx.expiresAt && { validityPeriod: { end: rx.expiresAt.toISOString() } }),
          },
          ...(rx.notes && { note: [{ text: rx.notes }] }),
        },
        patientId,
      );
      this.logger.log(`Prescription ${record.id} synced → OpenEMR FHIR MedicationRequest`);
    } else {
      const loincCode = RECORD_TYPE_LOINC[record.recordType] ?? '34133-9';
      await this.openemrService['callOpenemr'](
        token, 'POST', '/fhir/DocumentReference',
        {
          resourceType: 'DocumentReference',
          status: 'current',
          type: { coding: [{ system: 'http://loinc.org', code: loincCode }] },
          subject: { reference: `Patient/${openemrUuid}` },
          date: record.recordedAt.toISOString(),
          content: [
            {
              attachment: {
                ...(record.fileUrl && { url: record.fileUrl }),
                contentType: record.fileMimeType ?? 'application/octet-stream',
                title: record.title,
              },
            },
          ],
          context: { encounter: [] },
        },
        patientId,
      );
      this.logger.log(`Record ${record.id} (${record.recordType}) synced → OpenEMR FHIR DocumentReference`);
    }
  }

  // ── Vitals ───────────────────────────────────────────────────────────────

  @Process({ name: 'sync-vitals' })
  async handleSyncVitals(job: Job<SyncJobData>) {
    const { patientId, payload } = job.data;
    const reading = await this.prisma.vitalsReading.findUnique({
      where: { id: payload!.vitalsId as string },
      include: { patient: true },
    });

    if (!reading || !reading.patient.openemrPatientUuid) {
      this.logger.warn(`Skipping vitals sync — patient ${patientId} not yet synced to OpenEMR`);
      return;
    }

    const entries = buildVitalsBundleEntries(
      reading as unknown as Record<string, unknown>,
      reading.patient.openemrPatientUuid,
      reading.recordedAt,
    );

    if (entries.length === 0) {
      this.logger.log(`No non-null vitals to sync for reading ${reading.id}`);
      return;
    }

    const token = await this.openemrService.getAccessToken();
    await this.openemrService['callOpenemr'](
      token, 'POST', '/fhir',
      { resourceType: 'Bundle', type: 'transaction', entry: entries },
      patientId,
    );

    this.logger.log(`Synced ${entries.length} vitals observations for patient ${patientId}`);
  }

  // ── Lab Results (pull) ────────────────────────────────────────────────────

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
        const entries = (
          (bundle as Record<string, unknown>).entry ?? []
        ) as Array<{ resource: FhirDiagnosticReport }>;

        for (const entry of entries) {
          await this.upsertLabResultFromFhir(entry.resource, patient.id);
        }

        this.logger.log(`Processed ${entries.length} DiagnosticReports for patient ${patient.id}`);
      } catch (err: unknown) {
        this.logger.error(
          `Lab pull failed for patient ${patient.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // ── Lab Order (push) ─────────────────────────────────────────────────────

  @Process({ name: 'sync-labs' })
  async handleSyncLabOrder(job: Job<SyncJobData>) {
    const { patientId, payload } = job.data;
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: payload!.labOrderId as string },
      include: { patient: true, provider: true },
    });

    if (!labOrder || !labOrder.patient.openemrPatientUuid) {
      this.logger.warn(`Skipping lab order sync — patient ${patientId} not yet synced to OpenEMR`);
      return;
    }

    const token = await this.openemrService.getAccessToken();
    const fhirPayload: Record<string, unknown> = {
      resourceType: 'ServiceRequest',
      status: 'active',
      intent: 'order',
      code: { text: labOrder.notes ?? 'Lab Order' },
      subject: { reference: `Patient/${labOrder.patient.openemrPatientUuid}` },
      authoredOn: labOrder.orderedAt.toISOString(),
      ...(labOrder.notes && { note: [{ text: labOrder.notes }] }),
    };

    if (labOrder.provider.openemrProviderUuid) {
      fhirPayload.requester = { reference: `Practitioner/${labOrder.provider.openemrProviderUuid}` };
    }

    await this.openemrService['callOpenemr'](token, 'POST', '/fhir/ServiceRequest', fhirPayload, patientId);
    this.logger.log(`Lab order ${labOrder.id} synced → OpenEMR FHIR ServiceRequest`);
  }

  // ── Provider ─────────────────────────────────────────────────────────────

  @Process({ name: 'sync-provider' })
  async handleSyncProvider(job: Job<SyncJobData>) {
    const { patientId: providerId } = job.data;
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: { select: { email: true } } },
    });
    if (!provider) return;

    const token = await this.openemrService.getAccessToken();
    const body: Record<string, string> = {
      fname:     provider.firstName,
      lname:     provider.lastName,
      title:     provider.title,
      specialty: provider.specialty,
      npi:       provider.licenseNumber ?? '',
      email:     provider.user.email,
    };

    let openemrUuid: string;
    if (!provider.openemrProviderUuid) {
      const result = await this.openemrService['callOpenemr'](token, 'POST', '/api/practitioner', body);
      openemrUuid = ((result as Record<string, Record<string, string>>).data).uuid;
    } else {
      await this.openemrService['callOpenemr'](token, 'PUT', `/api/practitioner/${provider.openemrProviderUuid}`, body);
      openemrUuid = provider.openemrProviderUuid;
    }

    await this.prisma.provider.update({
      where: { id: providerId },
      data: { openemrProviderUuid: openemrUuid },
    });

    this.logger.log(`Provider ${providerId} synced → OpenEMR Practitioner: ${openemrUuid}`);
  }

  // ── Retry ────────────────────────────────────────────────────────────────

  @Process({ name: 'retry' })
  async handleRetry(job: Job<SyncJobData>) {
    return this.handleSyncPatient(job);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async upsertLabResultFromFhir(
    report: FhirDiagnosticReport,
    patientId: string,
  ): Promise<void> {
    // Find the oldest pending order that has no results yet; skip if none found
    const order = await this.prisma.labOrder.findFirst({
      where: { patientId, overallStatus: 'pending' },
      orderBy: { orderedAt: 'asc' },
      include: { results: { select: { id: true } } },
    });

    if (!order || order.results.length > 0) return;

    const testName = report.code?.text
      ?? report.code?.coding?.[0]?.display
      ?? 'Diagnostic Report';
    const testCode = report.code?.coding?.[0]?.code;
    const conclusion = report.conclusion ?? null;
    const reportedAt = report.issued ? new Date(report.issued) : new Date();

    await this.prisma.$transaction([
      this.prisma.labResult.create({
        data: {
          orderId:     order.id,
          patientId,
          testName,
          testCode,
          status:      'normal',
          valueDisplay: conclusion,
          isFlagged:   false,
        },
      }),
      this.prisma.labOrder.update({
        where: { id: order.id },
        data:  { overallStatus: 'normal', reportedAt },
      }),
    ]);

    this.logger.log(`Lab result upserted for order ${order.id} (patient ${patientId})`);
  }
}

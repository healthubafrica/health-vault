import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Gender, Prisma, RecordType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenemrService, OPENEMR_SYNC_QUEUE, PullResourceType, SyncJobData } from './openemr.service';

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

interface FhirObservation {
  resourceType: string;
  id?: string;
  status?: string;
  category?: FhirCodeableConcept[];
  code?: FhirCodeableConcept;
  subject?: { reference?: string };
  effectiveDateTime?: string;
  valueQuantity?: { value?: number; unit?: string };
  meta?: { lastUpdated?: string };
}

interface FhirMedicationRequest {
  resourceType: string;
  id?: string;
  status?: string;
  intent?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  subject?: { reference?: string };
  requester?: { reference?: string };
  authoredOn?: string;
  dosageInstruction?: Array<{
    text?: string;
    route?: FhirCodeableConcept;
    doseAndRate?: Array<{ doseQuantity?: { value?: number; unit?: string } }>;
  }>;
  dispenseRequest?: {
    numberOfRepeatsAllowed?: number;
    validityPeriod?: { end?: string };
  };
  note?: Array<{ text?: string }>;
  meta?: { lastUpdated?: string };
}

interface FhirDocumentReference {
  resourceType: string;
  id?: string;
  status?: string;
  type?: FhirCodeableConcept;
  subject?: { reference?: string };
  date?: string;
  description?: string;
  content?: Array<{
    attachment?: {
      url?: string;
      contentType?: string;
      title?: string;
      size?: number;
    };
  }>;
  context?: {
    encounter?: Array<{ reference?: string }>;
    period?: { start?: string; end?: string };
  };
  meta?: { lastUpdated?: string };
}

interface FhirEncounter {
  resourceType: string;
  id?: string;
  status?: string;
  class?: FhirCoding;
  type?: FhirCodeableConcept[];
  subject?: { reference?: string };
  participant?: Array<{ individual?: { reference?: string } }>;
  period?: { start?: string; end?: string };
  reasonCode?: FhirCodeableConcept[];
  meta?: { lastUpdated?: string };
}

interface FhirBundle {
  resourceType: string;
  entry?: Array<{ resource: Record<string, unknown> }>;
  link?: Array<{ relation: string; url: string }>;
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

// Reverse LOINC → VitalsReading column. Multiple LOINC codes can target the
// same column (e.g. variants of body temperature); list canonical codes first.
const LOINC_TO_VITALS_FIELD: Record<string, keyof typeof VITALS_LOINC> = (() => {
  const out: Record<string, keyof typeof VITALS_LOINC> = {};
  for (const [field, loinc] of Object.entries(VITALS_LOINC)) {
    out[loinc.code] = field as keyof typeof VITALS_LOINC;
  }
  return out;
})();

// Reverse LOINC → RecordType for DocumentReference pulls. Anything else falls
// back to 'document'.
const LOINC_TO_RECORD_TYPE: Record<string, RecordType> = (() => {
  const out: Record<string, RecordType> = {};
  for (const [type, code] of Object.entries(RECORD_TYPE_LOINC)) {
    if (!out[code]) out[code] = type as RecordType;
  }
  return out;
})();

// Numeric vitals columns are SmallInts on Prisma — round before insert.
const VITALS_INT_FIELDS = new Set<keyof typeof VITALS_LOINC>([
  'heartRate', 'systolicBp', 'diastolicBp', 'platelets',
]);

const PULL_PAGE_SIZE = 200;
const PULL_MAX_PAGES = 5;

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
        try {
          await this.openemrService['callOpenemr'](
            token, 'PUT', `/fhir/Patient/${patient.openemrPatientUuid}`,
            { ...fhirPatient, id: patient.openemrPatientUuid },
            patientId,
          );
          openemrUuid = patient.openemrPatientUuid!;
        } catch (putError: unknown) {
          const msg = putError instanceof Error ? putError.message : String(putError);
          // PUT 404 means the patient was deleted directly in OpenEMR — stale UUID.
          // Clear the stale UUID and re-create the patient record.
          if (!msg.includes('OpenEMR 404:')) throw putError;
          this.logger.warn(
            `PUT 404 for patient ${patientId} (UUID ${patient.openemrPatientUuid}) — re-creating in OpenEMR`,
          );
          await this.prisma.patient.update({
            where: { id: patientId },
            data: { openemrPatientUuid: null },
          });
          const created = await this.openemrService['callOpenemr'](
            token, 'POST', '/fhir/Patient', fhirPatient, patientId,
          );
          const raw = created as Record<string, unknown>;
          openemrUuid = (raw.uuid ?? raw.id) as string;
          if (!openemrUuid) {
            this.logger.error(
              `OpenEMR re-create POST returned no uuid/id. Response: ${JSON.stringify(created).slice(0, 500)}`,
            );
            throw new Error('OpenEMR FHIR Patient re-create returned no uuid field.');
          }
          this.logger.log(`Patient ${patientId} re-created in OpenEMR → new UUID: ${openemrUuid}`);
        }
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

      // Mirror final failure onto the patient record so the admin Patients page
      // shows 'failed' instead of the default 'pending'.
      if (isFinalAttempt) {
        await this.prisma.patient.update({
          where: { id: patientId },
          data: { openemrSyncStatus: 'failed' },
        }).catch(() => null);
      }

      throw error;
    }
  }

  // ── Encounter ────────────────────────────────────────────────────────────
  //
  // Uses FHIR /fhir/Encounter rather than the legacy REST
  // /api/patient/{uuid}/encounter endpoint. Production hit a 401 on every
  // REST encounter POST in late June 2026 — the OAuth token that works
  // for /fhir/* didn't grant whatever scope the REST API requires. FHIR
  // works with the existing token so we route all encounter writes
  // through it consistently with our other syncs (Patient, Observation,
  // MedicationRequest, DocumentReference, etc.).

  @Process({ name: 'sync-encounter' })
  async handleSyncEncounter(job: Job<SyncJobData>) {
    const { patientId, payload } = job.data;
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: payload!.appointmentId as string },
      include: {
        patient: true,
        provider: true,
        facility: { select: { openemrFacilityId: true, name: true } },
      },
    });

    if (!appointment || !appointment.patient.openemrPatientUuid) {
      this.logger.warn(`Skipping encounter sync — patient ${patientId} not yet synced to OpenEMR`);
      return;
    }

    // Resolve the location reference. Priority:
    //   1. The appointment's own facility (the right path).
    //   2. First imported facility (fallback for pre-facility appointments).
    //   3. No location at all — OpenEMR accepts encounters without one,
    //      better than spoofing a default we don't actually know about.
    let locationOpenemrId = appointment.facility?.openemrFacilityId ?? null;
    if (!locationOpenemrId) {
      const fallback = await this.prisma.healthcareFacility.findFirst({
        where: { openemrFacilityId: { not: null } },
        orderBy: { createdAt: 'asc' },
        select: { openemrFacilityId: true, name: true },
      });
      locationOpenemrId = fallback?.openemrFacilityId ?? null;
      if (!locationOpenemrId) {
        this.logger.warn(
          `Encounter sync for appointment ${appointment.id}: no facilities imported via /admin/facilities/import-from-openemr yet — encounter will be created without a location reference`,
        );
      }
    }

    const start = appointment.scheduledAt;
    const end = new Date(start.getTime() + (appointment.durationMinutes ?? 30) * 60_000);

    const fhirEncounter: Record<string, unknown> = {
      resourceType: 'Encounter',
      status: this.mapEncounterStatus(appointment.status),
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: appointment.isTelecare ? 'VR' : 'AMB',
        display: appointment.isTelecare ? 'virtual' : 'ambulatory',
      },
      subject: { reference: `Patient/${appointment.patient.openemrPatientUuid}` },
      period: { start: start.toISOString(), end: end.toISOString() },
    };

    if (appointment.reason) {
      fhirEncounter.reasonCode = [{ text: appointment.reason }];
    }

    if (appointment.provider?.openemrProviderUuid) {
      fhirEncounter.participant = [
        { individual: { reference: `Practitioner/${appointment.provider.openemrProviderUuid}` } },
      ];
    }

    if (locationOpenemrId) {
      fhirEncounter.location = [
        { location: { reference: `Location/${locationOpenemrId}` } },
      ];
    }

    const token = await this.openemrService.getAccessToken();

    // OpenEMR's FHIR module supports POST /fhir/Encounter on some versions
    // and not others — prod returned 404 "Route not found". Try FHIR first
    // (the right path); if the server doesn't expose it, fall back to the
    // legacy REST endpoint. Either one will let the encounter land.
    let openemrId: string | undefined;
    try {
      const created = await this.openemrService['callOpenemr'](
        token, 'POST', '/fhir/Encounter', fhirEncounter, patientId,
      );
      openemrId = (created as Record<string, unknown>).id as string | undefined
        ?? (created as Record<string, unknown>).uuid as string | undefined;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Only swap to REST when FHIR is unavailable (404). Anything else —
      // 401, 5xx — is a config or scope problem the REST path won't fix.
      if (!/OpenEMR 404/.test(msg)) throw err;

      this.logger.warn(
        `FHIR /fhir/Encounter not supported on this OpenEMR; falling back to REST /api/patient/{uuid}/encounter`,
      );

      const restBody: Record<string, unknown> = {
        date: start.toISOString().split('T')[0],
        onset_date: start.toISOString().split('T')[0],
        reason: appointment.reason ?? 'Scheduled Visit',
        ...(locationOpenemrId && { facility_id: locationOpenemrId }),
      };
      const created = await this.openemrService['callOpenemr'](
        token,
        'POST',
        `/api/patient/${appointment.patient.openemrPatientUuid}/encounter`,
        restBody,
        patientId,
      );
      openemrId = (created as Record<string, Record<string, unknown>>).data?.eid as string | undefined;
    }

    this.logger.log(
      `Encounter synced for appointment ${appointment.id} (patient ${patientId}): openemrId=${openemrId ?? 'unknown'}`,
    );
  }

  // Maps HHA's AppointmentStatus enum to FHIR's Encounter.status. FHIR's
  // accepted values: planned | arrived | triaged | in-progress | onleave |
  // finished | cancelled | entered-in-error | unknown.
  private mapEncounterStatus(status: string): string {
    switch (status) {
      case 'requested':   return 'planned';
      case 'confirmed':   return 'planned';
      case 'upcoming':    return 'arrived';
      case 'in_progress': return 'in-progress';
      case 'completed':   return 'finished';
      case 'cancelled':   return 'cancelled';
      case 'no_show':     return 'cancelled';
      default:            return 'unknown';
    }
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

  // ── Vitals / Observations (pull) ──────────────────────────────────────────
  //
  // Clinicians often record vitals directly in OpenEMR during in-person visits.
  // We pull `Observation` resources tagged with category=vital-signs since
  // the last cursor, group them by (patient, effectiveDateTime), and upsert
  // one VitalsReading per group. The reverse LOINC map fills the right
  // numeric column for each Observation in the group.

  @Process({ name: 'pull-observations' })
  async handlePullObservations() {
    const since = await this.openemrService.getPullCursor('Observation');
    const sinceParam = since ? `&_lastUpdated=gt${encodeURIComponent(since)}` : '';

    let highWater = since ?? new Date(0).toISOString();

    const resources = await this.fetchAllPages<FhirObservation>(
      `/fhir/Observation?category=vital-signs${sinceParam}`,
    ).catch((err) => {
      this.logger.error(`Observation pull failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    });

    if (resources.length === 0) {
      this.logger.log('No new Observations to pull');
      return;
    }

    // Group by (patient uuid, effectiveDateTime) — one VitalsReading per group.
    const groups = new Map<string, FhirObservation[]>();
    for (const obs of resources) {
      const patientUuid = (obs.subject?.reference ?? '').replace(/^Patient\//, '');
      const when = obs.effectiveDateTime;
      if (!patientUuid || !when) continue;
      const key = `${patientUuid}|${when}`;
      const arr = groups.get(key) ?? [];
      arr.push(obs);
      groups.set(key, arr);
      const last = obs.meta?.lastUpdated;
      if (last && last > highWater) highWater = last;
    }

    let created = 0;
    for (const [key, observations] of groups) {
      try {
        const [patientUuid, when] = key.split('|');
        const patient = await this.prisma.patient.findFirst({
          where: { openemrPatientUuid: patientUuid },
          select: { id: true },
        });
        if (!patient) continue;

        const recordedAt = new Date(when);

        // Dedup: the same (patient, recordedAt, source='openemr') combo is
        // assumed to be the same clinic measurement event. Skip if present.
        const existing = await this.prisma.vitalsReading.findFirst({
          where: { patientId: patient.id, recordedAt, source: 'openemr' },
          select: { id: true },
        });
        if (existing) continue;

        const data: Prisma.VitalsReadingUncheckedCreateInput = {
          patientId: patient.id,
          recordedAt,
          source: 'openemr',
        };

        for (const obs of observations) {
          const loinc = obs.code?.coding?.find(c => c.system === 'http://loinc.org')?.code;
          if (!loinc) continue;
          const field = LOINC_TO_VITALS_FIELD[loinc];
          const value = obs.valueQuantity?.value;
          if (!field || value === undefined || value === null) continue;
          (data as Record<string, unknown>)[field] = VITALS_INT_FIELDS.has(field)
            ? Math.round(value)
            : value;
        }

        // Skip empty groups (no recognised LOINC matches).
        const hasAnyValue = Object.keys(data).some(
          k => k !== 'patientId' && k !== 'recordedAt' && k !== 'source',
        );
        if (!hasAnyValue) continue;

        await this.prisma.vitalsReading.create({ data });
        created++;
      } catch (err: unknown) {
        this.logger.error(
          `Observation upsert failed for group ${key}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    await this.openemrService.setPullCursor('Observation', highWater);
    this.logger.log(`Pulled ${resources.length} Observations → created ${created} vitals readings`);
  }

  // ── Medications (pull) ────────────────────────────────────────────────────
  //
  // Prescriptions written in OpenEMR (e.g. by a clinician during an
  // in-person visit) flow back as ClinicalRecord(recordType=prescription)
  // + Prescription rows so they appear in the patient portal. We require a
  // matching Provider (via openemrProviderUuid) because Prescription has a
  // mandatory provider FK — unmatched requesters are skipped with a warning.

  @Process({ name: 'pull-medications' })
  async handlePullMedications() {
    await this.handleGenericPull<FhirMedicationRequest>(
      'MedicationRequest',
      '/fhir/MedicationRequest?status=active,completed,stopped',
      async (resource) => this.upsertMedicationFromFhir(resource),
    );
  }

  // ── Documents (pull) ──────────────────────────────────────────────────────
  //
  // Clinical notes, scan results, discharge summaries and other documents
  // attached to a patient in OpenEMR show up as DocumentReference resources.
  // We map the LOINC type code back to our RecordType enum and create a
  // ClinicalRecord pointing at the OpenEMR-hosted attachment URL.

  @Process({ name: 'pull-documents' })
  async handlePullDocuments() {
    await this.handleGenericPull<FhirDocumentReference>(
      'DocumentReference',
      '/fhir/DocumentReference?status=current',
      async (resource) => this.upsertDocumentFromFhir(resource),
    );
  }

  // ── Encounters (pull) ─────────────────────────────────────────────────────
  //
  // Finalised encounters (in-person visits, walk-ins, etc.) are stored as
  // ClinicalRecord(recordType=visit) so the portal timeline reflects every
  // clinical interaction, including those that did not originate as HHA
  // Appointments.

  @Process({ name: 'pull-encounters' })
  async handlePullEncounters() {
    // OpenEMR's FHIR Encounter search does not support the `status`
    // parameter ("search field does not exist or is not supported") — it
    // still returns 200 but logs a warning on every cycle. Filter to
    // finished encounters client-side in upsertEncounterFromFhir instead.
    await this.handleGenericPull<FhirEncounter>(
      'Encounter',
      '/fhir/Encounter',
      async (resource) => this.upsertEncounterFromFhir(resource),
    );
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
    if (!provider) {
      // Provider was deleted after the job was queued — log and discard (no retry).
      this.logger.error(`sync-provider: provider ${providerId} not found — discarding job`);
      return;
    }

    // Hard gate: do not push a provider to OpenEMR until an admin has
    // verified their credentials (license, specialty). Without this an
    // admin-promoted user could self-attest any NPI and we'd write it into
    // OpenEMR's user table. The job log is informational; we don't throw
    // so Bull doesn't retry forever — the next verify() call re-enqueues.
    if (!provider.verifiedAt) {
      this.logger.warn(
        `sync-provider skipped for ${providerId}: provider has not been verified by an admin`,
      );
      return;
    }

    const token = await this.openemrService.getAccessToken();
    const body: Record<string, string> = {
      fname:     provider.firstName,
      lname:     provider.lastName,
      title:     provider.title,
      specialty: provider.specialty,
      email:     provider.user.email,
      // Omit npi entirely when no license number — sending an empty string
      // causes OpenEMR to store an invalid NPI value.
      ...(provider.licenseNumber ? { npi: provider.licenseNumber } : {}),
    };

    let openemrUuid: string;
    try {
      if (!provider.openemrProviderUuid) {
        const result = await this.openemrService['callOpenemr'](token, 'POST', '/api/practitioner', body);
        // OpenEMR may return { data: { uuid } } or { uuid } depending on version.
        const payload = (result as Record<string, unknown>).data ?? result;
        openemrUuid = (payload as Record<string, string>)?.uuid;
        if (!openemrUuid) {
          throw new Error(
            `OpenEMR POST /api/practitioner returned no uuid. Response: ${JSON.stringify(result).slice(0, 500)}`,
          );
        }
      } else {
        await this.openemrService['callOpenemr'](token, 'PUT', `/api/practitioner/${provider.openemrProviderUuid}`, body);
        openemrUuid = provider.openemrProviderUuid;
      }
    } catch (err) {
      this.logger.error(
        `OpenEMR sync failed for provider ${providerId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }

    await this.prisma.provider.update({
      where: { id: providerId },
      data: { openemrProviderUuid: openemrUuid },
    });

    this.logger.log(`Provider ${providerId} synced → OpenEMR Practitioner: ${openemrUuid}`);
  }

  // ── Scheduled Recovery ───────────────────────────────────────────────────

  @Process({ name: 'recover-unsynced' })
  async handleRecoverUnsynced() {
    await this.openemrService.recoverUnsyncedPatients();
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

  // Fetch all pages of a FHIR Bundle by following `link.relation=next` URLs.
  // OpenEMR usually keeps `next` on the same `{base}/apis/default` host —
  // we pass the relative path to `fhirCall` so the same OAuth token applies.
  // Capped at PULL_MAX_PAGES to bound a single cron tick.
  private async fetchAllPages<T>(initialPath: string): Promise<T[]> {
    const out: T[] = [];
    const sep = initialPath.includes('?') ? '&' : '?';
    let nextPath: string | null = `${initialPath}${sep}_count=${PULL_PAGE_SIZE}`;

    for (let page = 0; page < PULL_MAX_PAGES && nextPath; page++) {
      const bundle = (await this.openemrService.fhirCall('GET', nextPath)) as unknown as FhirBundle;
      const entries = bundle.entry ?? [];
      for (const e of entries) out.push(e.resource as T);

      const next = bundle.link?.find(l => l.relation === 'next')?.url;
      if (!next) break;

      // Strip the base URL so we hit `/apis/default/...` consistently.
      const base = this.openemrService.openemrBase + '/apis/default';
      nextPath = next.startsWith(base) ? next.slice(base.length) : null;
    }

    return out;
  }

  // Common loop for incremental FHIR pulls: read cursor → fetch since cursor
  // → upsert each resource → advance cursor to max(lastUpdated).
  private async handleGenericPull<T extends { meta?: { lastUpdated?: string } }>(
    resource: PullResourceType,
    basePath: string,
    upsert: (resource: T) => Promise<'created' | 'skipped'>,
  ): Promise<void> {
    const since = await this.openemrService.getPullCursor(resource);
    const sinceParam = since ? `&_lastUpdated=gt${encodeURIComponent(since)}` : '';
    const path = `${basePath}${basePath.includes('?') ? '' : '?'}${sinceParam}`;

    let highWater = since ?? new Date(0).toISOString();
    let created = 0;
    let total = 0;

    const resources = await this.fetchAllPages<T>(path).catch((err) => {
      this.logger.error(`${resource} pull failed: ${err instanceof Error ? err.message : String(err)}`);
      return [] as T[];
    });

    for (const r of resources) {
      total++;
      try {
        const result = await upsert(r);
        if (result === 'created') created++;
      } catch (err: unknown) {
        this.logger.error(
          `${resource} upsert failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const last = r.meta?.lastUpdated;
      if (last && last > highWater) highWater = last;
    }

    await this.openemrService.setPullCursor(resource, highWater);
    this.logger.log(`Pulled ${total} ${resource}(s) → created ${created}`);
  }

  private async upsertMedicationFromFhir(
    med: FhirMedicationRequest,
  ): Promise<'created' | 'skipped'> {
    if (!med.id) return 'skipped';

    // Dedup: if we've already created a clinical record for this FHIR id, skip.
    const existing = await this.prisma.clinicalRecord.findUnique({
      where: { openemrResourceId: med.id },
      select: { id: true },
    });
    if (existing) return 'skipped';

    const patientUuid = (med.subject?.reference ?? '').replace(/^Patient\//, '');
    if (!patientUuid) return 'skipped';

    const patient = await this.prisma.patient.findFirst({
      where: { openemrPatientUuid: patientUuid },
      select: { id: true },
    });
    if (!patient) return 'skipped';

    // Prescription requires a provider — find by openemrProviderUuid from
    // the requester reference. Skip if we can't resolve one; pushing back a
    // prescription with an unknown prescriber would silently break the UI.
    const requesterUuid = (med.requester?.reference ?? '').replace(/^Practitioner\//, '');
    const provider = requesterUuid
      ? await this.prisma.provider.findFirst({
          where: { openemrProviderUuid: requesterUuid },
          select: { id: true },
        })
      : null;

    if (!provider) {
      this.logger.warn(
        `MedicationRequest ${med.id} has no resolvable provider (requester=${requesterUuid || 'none'}); skipping`,
      );
      return 'skipped';
    }

    const drugName = med.medicationCodeableConcept?.text
      ?? med.medicationCodeableConcept?.coding?.[0]?.display
      ?? 'Unknown medication';
    const dosageText = med.dosageInstruction?.[0]?.text ?? '';
    const route = med.dosageInstruction?.[0]?.route?.text ?? 'oral';
    const refills = med.dispenseRequest?.numberOfRepeatsAllowed ?? 0;
    const expiresAtRaw = med.dispenseRequest?.validityPeriod?.end;
    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
    const authoredOn = med.authoredOn ? new Date(med.authoredOn) : new Date();
    const notes = med.note?.map(n => n.text).filter(Boolean).join('\n') || null;

    // Best-effort split of "5mg twice daily" into dosage + frequency.
    const [dosage, ...freqRest] = dosageText.split(' ');
    const frequency = freqRest.join(' ') || 'as directed';

    await this.prisma.$transaction(async (tx) => {
      const record = await tx.clinicalRecord.create({
        data: {
          hhaRef: `RX-OE-${med.id!.slice(0, 12)}`,
          patientId: patient.id,
          providerId: provider.id,
          recordType: RecordType.prescription,
          title: drugName,
          description: notes,
          recordedAt: authoredOn,
          openemrResourceId: med.id,
        },
      });

      await tx.prescription.create({
        data: {
          recordId: record.id,
          patientId: patient.id,
          providerId: provider.id,
          drugName,
          dosage: dosage || 'as prescribed',
          frequency,
          route,
          refillsRemaining: refills,
          expiresAt,
          notes,
        },
      });
    });

    return 'created';
  }

  private async upsertDocumentFromFhir(
    doc: FhirDocumentReference,
  ): Promise<'created' | 'skipped'> {
    if (!doc.id) return 'skipped';

    const existing = await this.prisma.clinicalRecord.findUnique({
      where: { openemrResourceId: doc.id },
      select: { id: true },
    });
    if (existing) return 'skipped';

    const patientUuid = (doc.subject?.reference ?? '').replace(/^Patient\//, '');
    if (!patientUuid) return 'skipped';

    const patient = await this.prisma.patient.findFirst({
      where: { openemrPatientUuid: patientUuid },
      select: { id: true },
    });
    if (!patient) return 'skipped';

    const attachment = doc.content?.[0]?.attachment;
    const loinc = doc.type?.coding?.find(c => c.system === 'http://loinc.org')?.code;
    const mapped = loinc ? LOINC_TO_RECORD_TYPE[loinc] : undefined;
    const recordType: RecordType = mapped ?? RecordType.document;
    const title = attachment?.title ?? doc.description ?? doc.type?.text ?? 'Clinical document';
    const recordedAt = doc.date ? new Date(doc.date) : new Date();

    await this.prisma.clinicalRecord.create({
      data: {
        hhaRef: `DOC-OE-${doc.id.slice(0, 12)}`,
        patientId: patient.id,
        recordType,
        title,
        description: doc.description ?? null,
        fileUrl: attachment?.url ?? null,
        fileMimeType: attachment?.contentType ?? null,
        fileSizeBytes: attachment?.size ?? null,
        recordedAt,
        openemrResourceId: doc.id,
      },
    });

    return 'created';
  }

  private async upsertEncounterFromFhir(
    enc: FhirEncounter,
  ): Promise<'created' | 'skipped'> {
    if (!enc.id) return 'skipped';
    if (enc.status !== 'finished') return 'skipped';

    const existing = await this.prisma.clinicalRecord.findUnique({
      where: { openemrResourceId: enc.id },
      select: { id: true },
    });
    if (existing) return 'skipped';

    const patientUuid = (enc.subject?.reference ?? '').replace(/^Patient\//, '');
    if (!patientUuid) return 'skipped';

    const patient = await this.prisma.patient.findFirst({
      where: { openemrPatientUuid: patientUuid },
      select: { id: true },
    });
    if (!patient) return 'skipped';

    // Map the encounter's practitioner participant (if any) to an HHA Provider.
    const practitionerRef = enc.participant?.find(
      p => p.individual?.reference?.startsWith('Practitioner/'),
    )?.individual?.reference;
    const practitionerUuid = practitionerRef?.replace(/^Practitioner\//, '');
    const provider = practitionerUuid
      ? await this.prisma.provider.findFirst({
          where: { openemrProviderUuid: practitionerUuid },
          select: { id: true },
        })
      : null;

    const reason = enc.reasonCode?.[0]?.text
      ?? enc.reasonCode?.[0]?.coding?.[0]?.display
      ?? enc.type?.[0]?.text
      ?? 'Clinical visit';
    const recordedAt = enc.period?.start ? new Date(enc.period.start) : new Date();

    await this.prisma.clinicalRecord.create({
      data: {
        hhaRef: `ENC-OE-${enc.id.slice(0, 12)}`,
        patientId: patient.id,
        providerId: provider?.id ?? null,
        recordType: RecordType.visit,
        title: reason,
        recordedAt,
        openemrResourceId: enc.id,
      },
    });

    return 'created';
  }
}

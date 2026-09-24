import {
  OpenemrProcessor,
  codeableConceptText,
  extractEncounterId,
  mapOpenemrApptStatus,
  matchRecordTypeFromCategory,
  normalizeOpenemrAttachmentPath,
  parseOpenemrClinicTime,
} from './openemr.processor';

// handlePullAppointments only touches prisma.appointment and the two
// OpenemrService entry points (getAccessToken + callOpenemr), so the
// processor is constructed directly with minimal mocks (matching
// appointments.service.spec.ts's pattern) rather than a Nest TestingModule.
function buildProcessor(mockPrisma: any, mockOpenemrService: any) {
  return new OpenemrProcessor(mockPrisma, mockOpenemrService);
}

function buildOpenemrService(rows: Array<Record<string, unknown>>) {
  return {
    getAccessToken: jest.fn().mockResolvedValue('token'),
    callOpenemr: jest.fn().mockResolvedValue({ data: rows }),
  };
}

describe('parseOpenemrClinicTime', () => {
  it('converts clinic-local (Africa/Lagos, UTC+1) date and time to the UTC instant', () => {
    const parsed = parseOpenemrClinicTime('2026-07-15', '14:30:00');
    expect(parsed?.toISOString()).toBe('2026-07-15T13:30:00.000Z');
  });

  it('accepts HH:MM times without seconds', () => {
    const parsed = parseOpenemrClinicTime('2026-07-15', '09:05');
    expect(parsed?.toISOString()).toBe('2026-07-15T08:05:00.000Z');
  });

  it('returns null for a malformed date or time', () => {
    expect(parseOpenemrClinicTime('', '10:00:00')).toBeNull();
    expect(parseOpenemrClinicTime('15/07/2026', '10:00:00')).toBeNull();
    expect(parseOpenemrClinicTime('2026-07-15', '')).toBeNull();
  });
});

describe('mapOpenemrApptStatus', () => {
  it('maps cancelled codes to cancelled', () => {
    expect(mapOpenemrApptStatus('x')).toBe('cancelled');
    expect(mapOpenemrApptStatus('%')).toBe('cancelled');
  });

  it('maps ? to no_show', () => {
    expect(mapOpenemrApptStatus('?')).toBe('no_show');
  });

  it('returns null for codes HHA does not act on', () => {
    expect(mapOpenemrApptStatus('-')).toBeNull();
    expect(mapOpenemrApptStatus('@')).toBeNull();
    expect(mapOpenemrApptStatus('')).toBeNull();
  });
});

describe('OpenemrProcessor.handlePullAppointments', () => {
  const scheduledAt = new Date('2026-07-15T13:30:00.000Z'); // 14:30 Lagos

  function buildPrisma(tracked: Array<Record<string, unknown>>) {
    return {
      appointment: {
        findMany: jest.fn().mockResolvedValue(tracked),
        update: jest.fn().mockResolvedValue({}),
      },
    };
  }

  it('cancels the HHA appointment when OpenEMR marks it cancelled', async () => {
    const prisma = buildPrisma([
      { id: 'appt-1', openemrAppointmentId: '42', scheduledAt },
    ]);
    const openemr = buildOpenemrService([
      { pc_eid: 42, pc_apptstatus: 'x', pc_eventDate: '2026-07-15', pc_startTime: '14:30:00' },
    ]);
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAppointments();

    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'appt-1' },
        data: expect.objectContaining({ status: 'cancelled' }),
      }),
    );
  });

  it('marks the HHA appointment no_show when OpenEMR records a no-show', async () => {
    const prisma = buildPrisma([
      { id: 'appt-1', openemrAppointmentId: '42', scheduledAt },
    ]);
    const openemr = buildOpenemrService([
      { pc_eid: '42', pc_apptstatus: '?', pc_eventDate: '2026-07-15', pc_startTime: '14:30:00' },
    ]);
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAppointments();

    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'appt-1' },
        data: { status: 'no_show' },
      }),
    );
  });

  it('reschedules when the OpenEMR event time moved by a minute or more', async () => {
    const prisma = buildPrisma([
      { id: 'appt-1', openemrAppointmentId: '42', scheduledAt },
    ]);
    const openemr = buildOpenemrService([
      { pc_eid: 42, pc_apptstatus: '-', pc_eventDate: '2026-07-16', pc_startTime: '10:00:00' },
    ]);
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAppointments();

    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'appt-1' },
        data: expect.objectContaining({
          scheduledAt: new Date('2026-07-16T09:00:00.000Z'),
          previousScheduledAt: scheduledAt,
          rescheduleCount: { increment: 1 },
        }),
      }),
    );
  });

  it('does not touch an appointment whose OpenEMR event is unchanged', async () => {
    const prisma = buildPrisma([
      { id: 'appt-1', openemrAppointmentId: '42', scheduledAt },
    ]);
    const openemr = buildOpenemrService([
      { pc_eid: 42, pc_apptstatus: '-', pc_eventDate: '2026-07-15', pc_startTime: '14:30:00' },
    ]);
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAppointments();

    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it('ignores OpenEMR events that were not created from HHA', async () => {
    const prisma = buildPrisma([
      { id: 'appt-1', openemrAppointmentId: '42', scheduledAt },
    ]);
    const openemr = buildOpenemrService([
      { pc_eid: 999, pc_apptstatus: 'x', pc_eventDate: '2026-07-20', pc_startTime: '08:00:00' },
    ]);
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAppointments();

    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it('swallows pull failures without touching the database', async () => {
    const prisma = buildPrisma([]);
    const openemr = {
      getAccessToken: jest.fn().mockRejectedValue(new Error('OpenEMR not authenticated')),
      callOpenemr: jest.fn(),
    };
    const processor = buildProcessor(prisma, openemr);

    await expect(processor.handlePullAppointments()).resolves.toBeUndefined();

    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });
});

describe('codeableConceptText', () => {
  it('prefers text, then coding display, then coding code', () => {
    expect(codeableConceptText({ text: 'Penicillin allergy' })).toBe('Penicillin allergy');
    expect(codeableConceptText({ coding: [{ code: '91936005', display: 'Penicillin' }] })).toBe('Penicillin');
    expect(codeableConceptText({ coding: [{ code: '91936005' }] })).toBe('91936005');
    expect(codeableConceptText(undefined)).toBe('');
  });
});

describe('matchRecordTypeFromCategory', () => {
  it('matches a known OpenEMR document category name case-insensitively', () => {
    expect(matchRecordTypeFromCategory([{ text: 'Referral Letters' }])).toBe('referral');
    expect(matchRecordTypeFromCategory([{ text: 'referral letters' }])).toBe('referral');
    expect(matchRecordTypeFromCategory([{ coding: [{ display: 'Referrals' }] }])).toBe('referral');
  });

  it('returns undefined for an unrecognized category or a missing category', () => {
    expect(matchRecordTypeFromCategory([{ text: 'Lab Reports' }])).toBeUndefined();
    expect(matchRecordTypeFromCategory([])).toBeUndefined();
    expect(matchRecordTypeFromCategory(undefined)).toBeUndefined();
  });
});

describe('normalizeOpenemrAttachmentPath', () => {
  it('strips the host from an absolute OpenEMR URL, keeping only the API-relative path', () => {
    expect(normalizeOpenemrAttachmentPath('https://clinic.example.com/apis/default/fhir/Binary/abc123'))
      .toBe('/apis/default/fhir/Binary/abc123');
  });

  it('routes a bare FHIR relative reference through the FHIR API root', () => {
    expect(normalizeOpenemrAttachmentPath('Binary/abc123')).toBe('/apis/default/fhir/Binary/abc123');
  });

  it('leaves an already-API-relative path untouched', () => {
    expect(normalizeOpenemrAttachmentPath('/apis/default/fhir/Binary/abc123'))
      .toBe('/apis/default/fhir/Binary/abc123');
  });

  it('prefixes an unrecognized relative path with a leading slash', () => {
    expect(normalizeOpenemrAttachmentPath('some/weird/path')).toBe('/some/weird/path');
  });
});

describe('OpenemrProcessor.upsertDocumentFromFhir (recordType classification)', () => {
  function buildPrisma(existing: unknown = null) {
    return {
      clinicalRecord: {
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn().mockResolvedValue({}),
      },
      patient: {
        findFirst: jest.fn().mockResolvedValue({ id: 'patient-1' }),
      },
    };
  }

  const baseDoc = {
    resourceType: 'DocumentReference',
    id: 'doc-1',
    subject: { reference: 'Patient/oe-uuid-1' },
    content: [{ attachment: { url: 'https://clinic.example.com/apis/default/fhir/Binary/abc', contentType: 'application/pdf' } }],
  };

  it('classifies a document uploaded under the "Referral Letters" OpenEMR category as recordType=referral', async () => {
    const prisma = buildPrisma();
    const processor = buildProcessor(prisma, buildOpenemrService([]));

    await (processor as any).upsertDocumentFromFhir({ ...baseDoc, category: [{ text: 'Referral Letters' }] });

    expect(prisma.clinicalRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recordType: 'referral',
          fileUrl: '/apis/default/fhir/Binary/abc',
        }),
      }),
    );
  });

  it('falls back to the LOINC-based type when no category matches', async () => {
    const prisma = buildPrisma();
    const processor = buildProcessor(prisma, buildOpenemrService([]));

    await (processor as any).upsertDocumentFromFhir({
      ...baseDoc,
      type: { coding: [{ system: 'http://loinc.org', code: '57133-1' }] },
    });

    expect(prisma.clinicalRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recordType: 'referral' }) }),
    );
  });

  it('falls back to recordType=document when neither category nor LOINC match', async () => {
    const prisma = buildPrisma();
    const processor = buildProcessor(prisma, buildOpenemrService([]));

    await (processor as any).upsertDocumentFromFhir({ ...baseDoc, category: [{ text: 'Lab Reports' }] });

    expect(prisma.clinicalRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recordType: 'document' }) }),
    );
  });

  it('skips a DocumentReference already synced (idempotency by openemrResourceId)', async () => {
    const prisma = buildPrisma({ id: 'existing-record' });
    const processor = buildProcessor(prisma, buildOpenemrService([]));

    const result = await (processor as any).upsertDocumentFromFhir({ ...baseDoc, category: [{ text: 'Referral Letters' }] });

    expect(result).toBe('skipped');
    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
  });
});

describe('OpenemrProcessor.handleSyncAppointmentCalendar (REST contract)', () => {
  const scheduledAt = new Date('2026-07-15T13:30:00.000Z'); // 14:30 Lagos

  it('POSTs to the numeric pid with required pc_facility/pc_billing_location', async () => {
    const appointment = {
      id: 'appt-1',
      openemrAppointmentId: null,
      scheduledAt,
      durationMinutes: 30,
      serviceType: 'general_consultation',
      hhaRef: 'APT-2026-000001',
      reason: null,
      patient: { openemrPatientUuid: 'uuid-1' },
      provider: null,
      facility: { name: 'Main Clinic', openemrFacilityId: 'loc-uuid' },
    };
    const prisma = {
      appointment: {
        findUnique: jest.fn().mockResolvedValue(appointment),
        update: jest.fn().mockResolvedValue({}),
      },
      openemrSyncQueue: {
        create: jest.fn().mockResolvedValue({ id: 'q1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const callOpenemr = jest.fn().mockImplementation(async (_t: string, method: string, path: string) => {
      if (method === 'GET' && path === '/api/patient/uuid-1') return { data: { pid: 7 } };
      if (method === 'GET' && path === '/api/facility') return { data: [{ id: 3, name: 'Main Clinic' }] };
      if (method === 'POST' && path === '/api/patient/7/appointment') return { data: { id: 99 } };
      throw new Error(`unexpected call ${method} ${path}`);
    });
    const openemr = { getAccessToken: jest.fn().mockResolvedValue('token'), callOpenemr };
    const processor = buildProcessor(prisma, openemr);

    await processor.handleSyncAppointmentCalendar({
      data: { patientId: 'p1', operation: 'sync_record', payload: { appointmentId: 'appt-1', action: 'upsert' } },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as any);

    const post = callOpenemr.mock.calls.find((c) => c[1] === 'POST');
    expect(post?.[2]).toBe('/api/patient/7/appointment');
    expect(post?.[3]).toEqual(expect.objectContaining({
      pc_facility: '3',
      pc_billing_location: '3',
      pc_catid: '5',
      pc_eventDate: '2026-07-15',
      pc_startTime: '14:30',
    }));
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { openemrAppointmentId: '99' } }),
    );
  });

  it("uses the provider's home facility when the appointment names none", async () => {
    const appointment = {
      id: 'appt-1',
      openemrAppointmentId: null,
      scheduledAt,
      durationMinutes: 30,
      serviceType: 'general_consultation',
      hhaRef: 'APT-2026-000002',
      reason: null,
      patient: { openemrPatientUuid: 'uuid-1' },
      provider: { openemrProviderUuid: 'prov-uuid' },
      facility: null,
    };
    const prisma = {
      appointment: {
        findUnique: jest.fn().mockResolvedValue(appointment),
        update: jest.fn().mockResolvedValue({}),
      },
      openemrSyncQueue: {
        create: jest.fn().mockResolvedValue({ id: 'q1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const callOpenemr = jest.fn().mockImplementation(async (_t: string, method: string, path: string) => {
      if (method === 'GET' && path === '/api/patient/uuid-1') return { data: { pid: 7 } };
      if (method === 'GET' && path === '/api/practitioner') {
        return { data: [{ id: 9, uuid: 'prov-uuid', facility_id: 15 }] };
      }
      if (method === 'POST' && path === '/api/patient/7/appointment') return { data: { id: 200 } };
      throw new Error(`unexpected call ${method} ${path}`);
    });
    const openemr = { getAccessToken: jest.fn().mockResolvedValue('token'), callOpenemr };
    const processor = buildProcessor(prisma, openemr);

    await processor.handleSyncAppointmentCalendar({
      data: { patientId: 'p1', operation: 'sync_record', payload: { appointmentId: 'appt-1', action: 'upsert' } },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as any);

    const post = callOpenemr.mock.calls.find((c) => c[1] === 'POST');
    expect(post?.[3]).toEqual(expect.objectContaining({
      pc_aid: '9',
      pc_facility: '15',
      pc_billing_location: '15',
    }));
    // No facility name to match and the provider row already carries the
    // facility — the /api/facility list must not be needed at all.
    expect(callOpenemr.mock.calls.some((c) => c[2] === '/api/facility')).toBe(false);
  });

  it('fails the job when the numeric pid cannot be resolved (never writes with a uuid)', async () => {
    const appointment = {
      id: 'appt-1',
      openemrAppointmentId: null,
      scheduledAt,
      durationMinutes: 30,
      serviceType: 'general_consultation',
      hhaRef: 'APT-2026-000001',
      reason: null,
      patient: { openemrPatientUuid: 'uuid-1' },
      provider: null,
      facility: null,
    };
    const prisma = {
      appointment: {
        findUnique: jest.fn().mockResolvedValue(appointment),
        update: jest.fn().mockResolvedValue({}),
      },
      openemrSyncQueue: {
        create: jest.fn().mockResolvedValue({ id: 'q1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const callOpenemr = jest.fn().mockRejectedValue(new Error('OpenEMR 404 on GET /api/patient/uuid-1'));
    const openemr = { getAccessToken: jest.fn().mockResolvedValue('token'), callOpenemr };
    const processor = buildProcessor(prisma, openemr);

    await expect(
      processor.handleSyncAppointmentCalendar({
        data: { patientId: 'p1', operation: 'sync_record', payload: { appointmentId: 'appt-1', action: 'upsert' } },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as any),
    ).rejects.toThrow('Could not resolve numeric OpenEMR pid');

    expect(callOpenemr.mock.calls.every((c) => c[1] !== 'POST')).toBe(true);
  });
});

describe('OpenemrProcessor.handleSyncLabOrder (message fallback)', () => {
  it('delivers the order as a patient message when FHIR ServiceRequest is unsupported', async () => {
    const labOrder = {
      id: 'lab-1',
      hhaRef: 'LAB-2026-000001',
      orderedAt: new Date('2026-07-11T09:00:00.000Z'),
      notes: 'Full blood count',
      patient: { openemrPatientUuid: 'uuid-1' },
      provider: { title: 'Dr.', firstName: 'Ada', lastName: 'Obi', openemrProviderUuid: null },
    };
    const prisma = {
      labOrder: { findUnique: jest.fn().mockResolvedValue(labOrder) },
    };
    const callOpenemr = jest.fn().mockImplementation(async (_t: string, method: string, path: string) => {
      if (method === 'POST' && path === '/fhir/ServiceRequest') {
        throw new Error('OpenEMR 404 on POST /fhir/ServiceRequest: Route not found');
      }
      if (method === 'GET' && path === '/api/patient/uuid-1') return { data: { pid: 7 } };
      if (method === 'POST' && path === '/api/patient/7/message') return { mid: 1 };
      throw new Error(`unexpected call ${method} ${path}`);
    });
    const openemr = { getAccessToken: jest.fn().mockResolvedValue('token'), callOpenemr };
    const processor = buildProcessor(prisma, openemr);

    await processor.handleSyncLabOrder({
      data: { patientId: 'p1', operation: 'sync_labs', payload: { labOrderId: 'lab-1' } },
    } as any);

    const messagePost = callOpenemr.mock.calls.find((c) => c[2] === '/api/patient/7/message');
    expect(messagePost).toBeDefined();
    expect(messagePost?.[3]).toEqual(expect.objectContaining({
      groupname: 'Default',
      title: 'Other',
      message_status: 'New',
      body: expect.stringContaining('LAB-2026-000001'),
    }));
  });
});

describe('OpenemrProcessor clinical history pulls', () => {
  function buildPullMocks(resource: Record<string, unknown>, medicalInfo: Record<string, unknown> | null) {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p1', medicalInfo }),
      },
      patientMedicalInfo: {
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const openemr = {
      getAccessToken: jest.fn().mockResolvedValue('token'),
      getPullCursor: jest.fn().mockResolvedValue(null),
      setPullCursor: jest.fn().mockResolvedValue(undefined),
      fhirCall: jest.fn().mockResolvedValue({
        resourceType: 'Bundle',
        entry: [{ resource }],
      }),
      openemrBase: 'https://clinical.example.com',
    };
    return { prisma, openemr };
  }

  it('merges a pulled allergy into PatientMedicalInfo.allergies', async () => {
    const { prisma, openemr } = buildPullMocks(
      { resourceType: 'AllergyIntolerance', id: 'a1', patient: { reference: 'Patient/uuid-1' }, code: { text: 'Penicillin' } },
      { id: 'mi1', allergies: ['Dust'], chronicConditions: [], immunizations: [] },
    );
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAllergies();

    expect(prisma.patientMedicalInfo.update).toHaveBeenCalledWith({
      where: { id: 'mi1' },
      data: { allergies: { push: 'Penicillin' } },
    });
  });

  it('skips duplicates case-insensitively', async () => {
    const { prisma, openemr } = buildPullMocks(
      { resourceType: 'AllergyIntolerance', id: 'a1', patient: { reference: 'Patient/uuid-1' }, code: { text: 'penicillin' } },
      { id: 'mi1', allergies: ['Penicillin'], chronicConditions: [], immunizations: [] },
    );
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAllergies();

    expect(prisma.patientMedicalInfo.update).not.toHaveBeenCalled();
    expect(prisma.patientMedicalInfo.create).not.toHaveBeenCalled();
  });

  it('creates PatientMedicalInfo when the patient has none yet (immunization pull)', async () => {
    const { prisma, openemr } = buildPullMocks(
      { resourceType: 'Immunization', id: 'i1', patient: { reference: 'Patient/uuid-1' }, vaccineCode: { text: 'Yellow Fever' } },
      null,
    );
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullImmunizations();

    expect(prisma.patientMedicalInfo.create).toHaveBeenCalledWith({
      data: { patientId: 'p1', immunizations: ['Yellow Fever'] },
    });
  });
});

describe('OpenemrProcessor.handlePullServiceRequests', () => {
  // ServiceRequest.category is identical for a CareTest lab order and an
  // external referral (both 'procedure' order_type in these fixtures,
  // matching what production actually returns for orders 6/7) — the tests
  // below assert routing goes by the resolved performer Organization name,
  // not category.
  function buildServiceRequestMocks(opts: {
    serviceRequest: Record<string, unknown>;
    organizationName?: string;
    patient?: { id: string } | null;
    provider?: { id: string } | null;
    existingLabOrder?: { id: string } | null;
    existingReferral?: { id: string } | null;
  }) {
    const prisma = {
      patient: { findFirst: jest.fn().mockResolvedValue(opts.patient ?? { id: 'patient-1' }) },
      // 'provider' in opts (not `??`) — a test passing `provider: null` means
      // "no provider resolves", which `??` would silently override back to
      // the default since it treats null the same as undefined.
      provider: { findFirst: jest.fn().mockResolvedValue('provider' in opts ? opts.provider : { id: 'provider-1' }) },
      labOrder: {
        findUnique: jest.fn().mockResolvedValue(opts.existingLabOrder ?? null),
        create: jest.fn().mockResolvedValue({}),
      },
      clinicalRecord: {
        findUnique: jest.fn().mockResolvedValue(opts.existingReferral ?? null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const openemr = {
      getAccessToken: jest.fn().mockResolvedValue('token'),
      getPullCursor: jest.fn().mockResolvedValue(null),
      setPullCursor: jest.fn().mockResolvedValue(undefined),
      openemrBase: 'https://clinical.example.com',
      fhirCall: jest.fn().mockImplementation((_method: string, path: string) => {
        if (path.startsWith('/fhir/Organization/')) {
          return Promise.resolve({ resourceType: 'Organization', name: opts.organizationName });
        }
        return Promise.resolve({ resourceType: 'Bundle', entry: [{ resource: opts.serviceRequest }] });
      }),
    };
    return { prisma, openemr };
  }

  const baseServiceRequest = {
    resourceType: 'ServiceRequest',
    id: 'sr-order-7',
    status: 'active',
    intent: 'order',
    category: [{ coding: [{ system: 'http://snomed.info/sct', code: '387713003', display: 'Surgical procedure' }] }],
    code: { text: 'Malaria Parasite Test', coding: [{ code: 'MALARIA' }] },
    subject: { reference: 'Patient/uuid-16' },
    authoredOn: '2026-08-20T00:00:00Z',
    requester: { reference: 'Practitioner/uuid-prov-7' },
    performer: [{ reference: 'Organization/uuid-lab-4' }],
  };

  it('routes an order to LabOrder when the performer is the internal CareTest lab', async () => {
    const { prisma, openemr } = buildServiceRequestMocks({
      serviceRequest: baseServiceRequest,
      organizationName: 'HHA CareTest Internal Lab',
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullServiceRequests();

    expect(prisma.labOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hhaRef: 'LAB-OE-sr-order-7',
          patientId: 'patient-1',
          orderedBy: 'provider-1',
          openemrResourceId: 'sr-order-7',
          results: { create: [{ patientId: 'patient-1', testName: 'Malaria Parasite Test', testCode: 'MALARIA' }] },
        }),
      }),
    );
    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
  });

  it('routes an order to a referral ClinicalRecord when the performer is any other destination', async () => {
    const { prisma, openemr } = buildServiceRequestMocks({
      serviceRequest: {
        ...baseServiceRequest,
        id: 'sr-order-6',
        code: { text: 'Echocardiogram', coding: [{ code: 'ECHO' }] },
        patientInstruction: 'Arrive 15 minutes early; no caffeine for 24 hours.',
      },
      organizationName: 'Cardiology Diagnostic Center',
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullServiceRequests();

    expect(prisma.clinicalRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hhaRef: 'REF-OE-sr-order-6',
          patientId: 'patient-1',
          providerId: 'provider-1',
          recordType: 'referral',
          title: 'Echocardiogram',
          openemrResourceId: 'sr-order-6',
          // Structured fields the patient portal renders directly — the
          // order's own lifecycle status, not a clinical result status.
          orderStatus: 'active',
          destination: 'Cardiology Diagnostic Center',
          patientInstruction: 'Arrive 15 minutes early; no caffeine for 24 hours.',
        }),
      }),
    );
    expect(prisma.labOrder.create).not.toHaveBeenCalled();
  });

  it('skips lab-order creation when no HHA provider resolves for the requester', async () => {
    const { prisma, openemr } = buildServiceRequestMocks({
      serviceRequest: baseServiceRequest,
      organizationName: 'HHA CareTest Internal Lab',
      provider: null,
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullServiceRequests();

    expect(prisma.labOrder.create).not.toHaveBeenCalled();
  });

  it('skips a referral already imported (dedup by openemrResourceId)', async () => {
    const { prisma, openemr } = buildServiceRequestMocks({
      serviceRequest: { ...baseServiceRequest, id: 'sr-order-6' },
      organizationName: 'Cardiology Diagnostic Center',
      existingReferral: { id: 'existing-record' },
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullServiceRequests();

    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
  });
});

describe('OpenemrProcessor.handlePullAvsSummaries', () => {
  // The AVS module's own clinician-release gate lives entirely on the
  // OpenEMR side (hha_ai_after_visit_summary.status='approved' AND
  // publication_status='ready') — GET .../published/encounter/:id only
  // ever returns a summary once that gate has passed, and returns
  // status:'not_found' otherwise. These tests assert the pull job trusts
  // that response as-is rather than re-deriving release state itself.
  function buildAvsMocks(opts: {
    encounters: Array<Record<string, unknown>>;
    avsResponses: Record<number, Record<string, unknown>>;
    existingRecord?: { id: string; openemrAckedAt?: Date | null } | null;
    lastCheckedMap?: Record<string, string>;
  }) {
    const prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([{ id: 'patient-1', openemrPatientUuid: 'uuid-16' }]),
      },
      clinicalRecord: {
        findUnique: jest.fn().mockResolvedValue(opts.existingRecord ?? null),
        create: jest.fn().mockResolvedValue({ id: 'record-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const openemr = {
      getAccessToken: jest.fn().mockResolvedValue('token'),
      getAvsLastCheckedMap: jest.fn().mockResolvedValue(opts.lastCheckedMap ?? {}),
      markAvsChecked: jest.fn().mockResolvedValue(undefined),
      callOpenemr: jest.fn().mockImplementation((_token: string, method: string, path: string) => {
        if (path.endsWith('/encounter')) {
          return Promise.resolve({ data: opts.encounters });
        }
        const ackMatch = /\/api\/hha\/avs\/published\/encounter\/(\d+)\/ack$/.exec(path);
        if (ackMatch) {
          return Promise.resolve({ status: 'ok' });
        }
        const statusMatch = /\/api\/hha\/avs\/published\/encounter\/(\d+)$/.exec(path);
        if (statusMatch) {
          const encounterId = Number(statusMatch[1]);
          return Promise.resolve(opts.avsResponses[encounterId] ?? { status: 'not_found' });
        }
        return Promise.resolve({ status: 'not_found' });
      }),
    };
    return { prisma, openemr };
  }

  it('creates a visit_summary record for a released AVS and acknowledges delivery', async () => {
    const { prisma, openemr } = buildAvsMocks({
      encounters: [{ encounter: 102 }],
      avsResponses: {
        102: {
          status: 'ok',
          encounter: 102,
          version: 1,
          approved_text: 'Patient presented with...',
          approved_at: '2026-08-20 10:00:00',
        },
      },
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAvsSummaries();

    expect(prisma.clinicalRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: 'patient-1',
          recordType: 'visit_summary',
          openemrResourceId: 'AVS-102-v1',
          description: 'Patient presented with...',
        }),
      }),
    );
    // Delivery ack must follow the same encounter/version.
    expect(openemr.callOpenemr).toHaveBeenCalledWith(
      'token', 'POST', '/api/hha/avs/published/encounter/102/ack',
      { version: 1, portal_record_id: 'record-1' }, 'patient-1',
    );
  });

  it('does not create a record when no summary has been released for the encounter', async () => {
    const { prisma, openemr } = buildAvsMocks({
      encounters: [{ encounter: 102 }],
      avsResponses: {}, // falls through to status:'not_found'
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAvsSummaries();

    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
  });

  it('skips an already-imported and already-acked summary (dedup by encounter+version)', async () => {
    const { prisma, openemr } = buildAvsMocks({
      encounters: [{ encounter: 102 }],
      avsResponses: {
        102: { status: 'ok', encounter: 102, version: 1, approved_text: 'x', approved_at: '2026-08-20 10:00:00' },
      },
      existingRecord: { id: 'already-there', openemrAckedAt: new Date('2026-08-20') },
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAvsSummaries();

    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
    expect(openemr.callOpenemr).not.toHaveBeenCalledWith(
      'token', 'POST', expect.stringContaining('/ack'), expect.anything(), expect.anything(),
    );
  });

  it('retries the delivery ack for an existing record OpenEMR never got confirmation for', async () => {
    const { prisma, openemr } = buildAvsMocks({
      encounters: [{ encounter: 102 }],
      avsResponses: {
        102: { status: 'ok', encounter: 102, version: 1, approved_text: 'x', approved_at: '2026-08-20 10:00:00' },
      },
      existingRecord: { id: 'already-there', openemrAckedAt: null },
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAvsSummaries();

    // Record already exists — must not be recreated — but the ack that
    // previously failed (or was never attempted) is retried this cycle.
    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
    expect(openemr.callOpenemr).toHaveBeenCalledWith(
      'token', 'POST', '/api/hha/avs/published/encounter/102/ack',
      { version: 1, portal_record_id: 'already-there' }, 'patient-1',
    );
    expect(prisma.clinicalRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'already-there' }, data: { openemrAckedAt: expect.any(Date) } }),
    );
  });

  it('checks a patient with no prior throttle entry regardless of visit age', async () => {
    // Regression test: an earlier fix scoped the roster to patients with a
    // ClinicalRecord(visit) in the last 90 days, which permanently excluded
    // anyone whose visit predated that window — including a released AVS
    // for it. There is no such exclusion in the query at all any more.
    const { prisma, openemr } = buildAvsMocks({
      encounters: [{ encounter: 102 }],
      avsResponses: {
        102: { status: 'ok', encounter: 102, version: 1, approved_text: 'x', approved_at: '2026-08-20 10:00:00' },
      },
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAvsSummaries();

    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { openemrPatientUuid: { not: null } } }),
    );
    expect(prisma.clinicalRecord.create).toHaveBeenCalled();
    expect(openemr.markAvsChecked).toHaveBeenCalledWith('patient-1', expect.any(Number));
  });

  it('skips a patient checked within the last hour', async () => {
    const { prisma, openemr } = buildAvsMocks({
      encounters: [{ encounter: 102 }],
      avsResponses: {
        102: { status: 'ok', encounter: 102, version: 1, approved_text: 'x', approved_at: '2026-08-20 10:00:00' },
      },
      lastCheckedMap: { 'patient-1': String(Date.now() - 5 * 60 * 1000) }, // checked 5 min ago
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullAvsSummaries();

    expect(openemr.getAccessToken).not.toHaveBeenCalled();
    expect(prisma.clinicalRecord.create).not.toHaveBeenCalled();
  });
});

describe('OpenemrProcessor.handlePullLabResults (order matching)', () => {
  // Reproduces the exact scenario the old "oldest pending order for this
  // patient" heuristic got wrong: two orders pending at once. The report
  // must land on the order its basedOn reference actually names, not
  // whichever was ordered first.
  function buildLabResultMocks(opts: {
    patientId: string;
    matchingOrder: { id: string; openemrResourceId?: string | null; orderedAt: Date };
    otherPendingOrder?: { id: string; openemrResourceId?: string | null; orderedAt: Date };
    report: Record<string, unknown>;
  }) {
    const allOrders = [opts.matchingOrder, opts.otherPendingOrder].filter(Boolean) as Array<{
      id: string; openemrResourceId?: string | null; orderedAt: Date;
    }>;

    const prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([{ id: opts.patientId, openemrPatientUuid: 'uuid-16' }]),
      },
      labOrder: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          if (where.openemrResourceId) {
            const match = allOrders.find((o) => o.openemrResourceId === where.openemrResourceId);
            return Promise.resolve(match ? { ...match, results: [] } : null);
          }
          // Fallback path: oldest pending, ignoring openemrResourceId.
          const oldest = [...allOrders].sort((a, b) => a.orderedAt.getTime() - b.orderedAt.getTime())[0];
          return Promise.resolve(oldest ? { ...oldest, results: [] } : null);
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      labResult: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const openemr = {
      getAccessToken: jest.fn().mockResolvedValue('token'),
      callOpenemr: jest.fn().mockResolvedValue({ entry: [{ resource: opts.report }] }),
    };
    return { prisma, openemr };
  }

  it('matches the report to the order named in basedOn, not the oldest pending order', async () => {
    const olderOrder = { id: 'order-older', openemrResourceId: 'sr-older-uuid', orderedAt: new Date('2026-08-01') };
    const targetOrder = { id: 'order-target', openemrResourceId: 'sr-target-uuid', orderedAt: new Date('2026-08-20') };
    const { prisma, openemr } = buildLabResultMocks({
      patientId: 'patient-1',
      matchingOrder: targetOrder,
      otherPendingOrder: olderOrder,
      report: {
        resourceType: 'DiagnosticReport',
        code: { text: 'Malaria Parasite Test' },
        basedOn: [{ reference: 'ServiceRequest/sr-target-uuid' }],
      },
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullLabResults();

    expect(prisma.labOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'order-target' } }),
    );
  });

  it('falls back to the oldest-pending match when the report has no basedOn', async () => {
    const onlyOrder = { id: 'order-1', openemrResourceId: null, orderedAt: new Date('2026-08-20') };
    const { prisma, openemr } = buildLabResultMocks({
      patientId: 'patient-1',
      matchingOrder: onlyOrder,
      report: {
        resourceType: 'DiagnosticReport',
        code: { text: 'Malaria Parasite Test' },
      },
    });
    const processor = buildProcessor(prisma, openemr);

    await processor.handlePullLabResults();

    expect(prisma.labOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'order-1' } }),
    );
  });
});

describe('extractEncounterId', () => {
  it('reads a FHIR resource id', () => {
    expect(extractEncounterId({ resourceType: 'Encounter', id: 'fhir-1' })).toBe('fhir-1');
  });

  it('prefers the uuid over the numeric encounter number in a REST { data } response', () => {
    expect(extractEncounterId({ data: { uuid: 'u-1', encounter: 5 } })).toBe('u-1');
  });

  it('falls back to encounter, then eid, when there is no uuid', () => {
    expect(extractEncounterId({ data: { encounter: 5 } })).toBe('5');
    expect(extractEncounterId({ data: { eid: 7 } })).toBe('7');
  });

  it('reads a top-level uuid and a single-element data array', () => {
    expect(extractEncounterId({ uuid: 'top-1' })).toBe('top-1');
    expect(extractEncounterId({ data: [{ uuid: 'arr-1' }] })).toBe('arr-1');
  });

  it('returns undefined when nothing recognisable is present', () => {
    expect(extractEncounterId({})).toBeUndefined();
    expect(extractEncounterId({ data: {} })).toBeUndefined();
    expect(extractEncounterId(null)).toBeUndefined();
    expect(extractEncounterId(undefined)).toBeUndefined();
  });
});

describe('OpenemrProcessor.handleSyncEncounter (FHIR-first with REST fallback)', () => {
  const appointment = {
    id: 'appt-1',
    status: 'requested',
    isTelecare: false,
    reason: 'Checkup',
    scheduledAt: new Date('2026-07-15T13:30:00.000Z'),
    durationMinutes: 30,
    patient: { openemrPatientUuid: 'uuid-1' },
    provider: null,
    facility: { name: 'Main Clinic', openemrFacilityId: 'loc-uuid' },
  };

  function buildPrisma() {
    return {
      appointment: { findUnique: jest.fn().mockResolvedValue(appointment) },
      openemrSyncQueue: {
        create: jest.fn().mockResolvedValue({ id: 'q1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
  }

  const job = {
    data: { patientId: 'p1', operation: 'sync_record', payload: { appointmentId: 'appt-1' } },
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as any;

  // OpenEMR here has no POST /fhir/Encounter (404 "Route not found") so every
  // sync takes the REST fallback. The FHIR attempt is a probe: it must tell the
  // shared HTTP helper that a 404 is expected, otherwise that helper writes an
  // IntegrationError row + ERROR log on every booking for a sync that succeeds.
  it('declares the FHIR 404 as expected, then falls back to REST', async () => {
    const callOpenemr = jest.fn().mockImplementation(async (_t: string, method: string, path: string) => {
      if (method === 'POST' && path === '/fhir/Encounter') {
        throw new Error('OpenEMR 404 on POST /fhir/Encounter: Route not found');
      }
      if (method === 'POST' && path === '/api/patient/uuid-1/encounter') {
        return { data: { uuid: 'enc-uuid', encounter: 42 } };
      }
      throw new Error(`unexpected call ${method} ${path}`);
    });
    const openemr = { getAccessToken: jest.fn().mockResolvedValue('token'), callOpenemr };
    const processor = buildProcessor(buildPrisma(), openemr);
    jest.spyOn((processor as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((processor as any).logger, 'log').mockImplementation(() => undefined);

    await expect(processor.handleSyncEncounter(job)).resolves.toBeUndefined();

    const fhirCall = callOpenemr.mock.calls.find((c) => c[2] === '/fhir/Encounter');
    expect(fhirCall?.[6]).toEqual({ expectedStatuses: [404] });
    expect(callOpenemr.mock.calls.some((c) => c[2] === '/api/patient/uuid-1/encounter')).toBe(true);
  });

  it('logs the encounter id it got back from the REST fallback', async () => {
    const callOpenemr = jest.fn().mockImplementation(async (_t: string, _m: string, path: string) => {
      if (path === '/fhir/Encounter') throw new Error('OpenEMR 404 on POST /fhir/Encounter: x');
      return { data: { uuid: 'enc-uuid', encounter: 42 } };
    });
    const processor = buildProcessor(buildPrisma(), {
      getAccessToken: jest.fn().mockResolvedValue('token'),
      callOpenemr,
    });
    jest.spyOn((processor as any).logger, 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn((processor as any).logger, 'log').mockImplementation(() => undefined);

    await processor.handleSyncEncounter(job);

    expect(log).toHaveBeenCalledWith(expect.stringContaining('openemrId=enc-uuid'));
  });

  it('warns with only the response KEYS (never values) when the REST response has no recognisable id', async () => {
    const callOpenemr = jest.fn().mockImplementation(async (_t: string, _m: string, path: string) => {
      if (path === '/fhir/Encounter') throw new Error('OpenEMR 404 on POST /fhir/Encounter: x');
      return { weird: { patientName: 'Jane Doe' } };
    });
    const processor = buildProcessor(buildPrisma(), {
      getAccessToken: jest.fn().mockResolvedValue('token'),
      callOpenemr,
    });
    const warn = jest.spyOn((processor as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((processor as any).logger, 'log').mockImplementation(() => undefined);

    await processor.handleSyncEncounter(job);

    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes('weird'))).toBe(true);
    expect(messages.some((m) => m.includes('Jane Doe'))).toBe(false);
  });

  it('does not fall back on a non-404 error — it is a real failure and must propagate', async () => {
    const callOpenemr = jest.fn().mockImplementation(async (_t: string, _m: string, path: string) => {
      if (path === '/fhir/Encounter') throw new Error('OpenEMR 401 on POST /fhir/Encounter: unauthorized');
      return { data: { uuid: 'should-not-happen' } };
    });
    const prisma = { ...buildPrisma() };
    const processor = buildProcessor(prisma, {
      getAccessToken: jest.fn().mockResolvedValue('token'),
      callOpenemr,
    });
    (processor as any).failQueueItem = jest.fn().mockResolvedValue(undefined);

    await expect(processor.handleSyncEncounter(job)).rejects.toThrow(/OpenEMR 401/);

    expect(callOpenemr.mock.calls.some((c) => c[2].startsWith('/api/patient/'))).toBe(false);
  });
});

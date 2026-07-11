import {
  OpenemrProcessor,
  codeableConceptText,
  mapOpenemrApptStatus,
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

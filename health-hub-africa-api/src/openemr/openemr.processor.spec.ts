import {
  OpenemrProcessor,
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

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RecordsService } from './records.service';

// getOpenemrDocument/findRecords/findRecord only touch prisma.clinicalRecord
// (+ patientProviderAssignment for the assigned-provider path) and
// openemrService.fetchDocumentBytes, so the service is constructed directly
// with minimal mocks rather than a Nest TestingModule.
function buildService(overrides: { clinicalRecord?: unknown; patientProviderAssignment?: unknown } = {}) {
  const prisma = {
    clinicalRecord: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      ...(overrides.clinicalRecord as object),
    },
    patient: {
      findUnique: jest.fn().mockResolvedValue({ id: 'patient-1' }),
    },
    patientProviderAssignment: {
      findFirst: jest.fn().mockResolvedValue(null),
      ...(overrides.patientProviderAssignment as object),
    },
  };
  const openemrService = { fetchDocumentBytes: jest.fn() };
  const storageService = {};
  const s3Service = {};
  const service = new RecordsService(prisma as any, openemrService as any, storageService as any, s3Service as any);
  return { service, prisma, openemrService };
}

const patientUser = { sub: 'user-1', role: UserRole.patient } as any;
const otherPatientUser = { sub: 'user-2', role: UserRole.patient } as any;
const adminUser = { sub: 'admin-1', role: UserRole.admin } as any;

function openemrRecord(overrides: Record<string, unknown> = {}) {
  return {
    patientId: 'patient-1',
    isDownloadable: true,
    deletedAt: null,
    openemrResourceId: 'oe-doc-1',
    fileUrl: '/apis/default/fhir/Binary/abc123',
    fileMimeType: null,
    title: 'MRI Referral — DiaMED',
    patient: { userId: 'user-1' },
    ...overrides,
  };
}

describe('RecordsService.getOpenemrDocument', () => {
  it('streams the file for the owning patient, deriving patientId from the session — never a client-supplied id', async () => {
    const { service, prisma, openemrService } = buildService({
      clinicalRecord: { findUnique: jest.fn().mockResolvedValue(openemrRecord()) },
    });
    openemrService.fetchDocumentBytes.mockResolvedValue({ buffer: Buffer.from('pdf'), contentType: 'application/pdf' });

    const result = await service.getOpenemrDocument('record-1', patientUser);

    expect(prisma.clinicalRecord.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'record-1' } }),
    );
    expect(openemrService.fetchDocumentBytes).toHaveBeenCalledWith('/apis/default/fhir/Binary/abc123', 'patient-1');
    expect(result).toEqual({ buffer: Buffer.from('pdf'), contentType: 'application/pdf', title: 'MRI Referral — DiaMED' });
  });

  it('rejects a patient who does not own the record, without ever calling OpenEMR', async () => {
    const { service, openemrService } = buildService({
      clinicalRecord: { findUnique: jest.fn().mockResolvedValue(openemrRecord()) },
    });

    await expect(service.getOpenemrDocument('record-1', otherPatientUser)).rejects.toThrow(ForbiddenException);
    expect(openemrService.fetchDocumentBytes).not.toHaveBeenCalled();
  });

  it('allows an admin to access any patient\'s document', async () => {
    const { service, openemrService } = buildService({
      clinicalRecord: { findUnique: jest.fn().mockResolvedValue(openemrRecord()) },
    });
    openemrService.fetchDocumentBytes.mockResolvedValue({ buffer: Buffer.from('pdf'), contentType: 'application/pdf' });

    await expect(service.getOpenemrDocument('record-1', adminUser)).resolves.toBeDefined();
  });

  it('404s for a record with no openemrResourceId — the S3 flow owns that record instead', async () => {
    const { service, openemrService } = buildService({
      clinicalRecord: { findUnique: jest.fn().mockResolvedValue(openemrRecord({ openemrResourceId: null, fileUrl: 'records/user-1/x.pdf' })) },
    });

    await expect(service.getOpenemrDocument('record-1', patientUser)).rejects.toThrow(NotFoundException);
    expect(openemrService.fetchDocumentBytes).not.toHaveBeenCalled();
  });

  it('404s for a soft-deleted record', async () => {
    const { service } = buildService({
      clinicalRecord: { findUnique: jest.fn().mockResolvedValue(openemrRecord({ deletedAt: new Date() })) },
    });

    await expect(service.getOpenemrDocument('record-1', patientUser)).rejects.toThrow(NotFoundException);
  });

  it('404s when the record does not exist', async () => {
    const { service } = buildService({
      clinicalRecord: { findUnique: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.getOpenemrDocument('missing', patientUser)).rejects.toThrow(NotFoundException);
  });

  it('prefers the stored fileMimeType over whatever OpenEMR returns', async () => {
    const { service, openemrService } = buildService({
      clinicalRecord: { findUnique: jest.fn().mockResolvedValue(openemrRecord({ fileMimeType: 'application/pdf' })) },
    });
    openemrService.fetchDocumentBytes.mockResolvedValue({ buffer: Buffer.from('x'), contentType: 'application/octet-stream' });

    const result = await service.getOpenemrDocument('record-1', patientUser);

    expect(result.contentType).toBe('application/pdf');
  });
});

describe('RecordsService — redacting the OpenEMR file path from API responses', () => {
  it('findRecord nulls out fileUrl for an OpenEMR-sourced record, keeping openemrResourceId as a presence signal', async () => {
    const { service } = buildService({
      clinicalRecord: { findUnique: jest.fn().mockResolvedValue(openemrRecord()) },
    });

    const result = await service.findRecord('record-1', patientUser);

    expect(result.fileUrl).toBeNull();
    expect(result.openemrResourceId).toBe('oe-doc-1');
  });

  it('findRecord leaves fileUrl untouched for a portal-uploaded (S3) record', async () => {
    const { service } = buildService({
      clinicalRecord: {
        findUnique: jest.fn().mockResolvedValue(
          openemrRecord({ openemrResourceId: null, fileUrl: 'records/user-1/abc.pdf' }),
        ),
      },
    });

    const result = await service.findRecord('record-1', patientUser);

    expect(result.fileUrl).toBe('records/user-1/abc.pdf');
  });

  it('findRecords redacts fileUrl per-row across a mixed list of OpenEMR and portal-uploaded records', async () => {
    const { service } = buildService({
      clinicalRecord: {
        findMany: jest.fn().mockResolvedValue([
          openemrRecord({ patientId: 'patient-1' }),
          openemrRecord({ openemrResourceId: null, fileUrl: 'records/user-1/abc.pdf' }),
        ]),
      },
    });

    const results = await service.findRecords(undefined, patientUser);

    expect(results[0].fileUrl).toBeNull();
    expect(results[1].fileUrl).toBe('records/user-1/abc.pdf');
  });
});

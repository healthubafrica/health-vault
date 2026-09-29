import { DocumentCategory } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { S3Service } from '../storage/s3.service';
import { AnalyticsService } from '../analytics/analytics.service';

describe('DocumentsService analytics', () => {
  it('emits upload_success only after the document is finalized', async () => {
    const createdAt = new Date('2026-09-29T11:00:00Z');
    const created = { id: 'document-1', category: DocumentCategory.laboratory, fileSizeBytes: 1234, createdAt };
    const prisma = {
      clinicalRecord: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const storage = { assertUploadAllowed: jest.fn().mockResolvedValue(undefined) };
    const s3 = { headObject: jest.fn().mockResolvedValue({ contentLength: 1234, contentType: 'application/pdf' }) };
    const analytics = { emitServerEvent: jest.fn().mockResolvedValue(undefined) };
    const service = new DocumentsService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      s3 as unknown as S3Service,
      analytics as unknown as AnalyticsService,
    );

    await service.create({
      objectKey: 'records/user-1/file.pdf',
      fileName: 'file.pdf',
      category: DocumentCategory.laboratory,
    }, { sub: 'user-1', email: 'patient@test.com', role: 'patient', patientId: 'patient-1' });

    expect(analytics.emitServerEvent).toHaveBeenCalledWith('upload_success', {
      eventId: 'document-upload:document-1',
      patientId: 'patient-1',
      occurredAt: createdAt,
      properties: { documentId: 'document-1', category: DocumentCategory.laboratory, sizeBytes: 1234 },
    });
  });
});

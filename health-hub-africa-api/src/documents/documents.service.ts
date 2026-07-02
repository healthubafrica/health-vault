import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { S3Service } from '../storage/s3.service';
import { PaymentRequiredException } from '../common/exceptions/payment-required.exception';
import { generateRecordRef } from '../common/utils/record-ref.util';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { RequestDocumentUploadUrlDto } from './dto/request-document-upload-url.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ReplaceDocumentDto } from './dto/replace-document.dto';
import {
  DOCUMENT_MIME_TO_EXT,
  PRESIGNED_UPLOAD_EXPIRY_SECONDS,
} from './documents.constants';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly s3Service: S3Service,
  ) {}

  // ── Upload URL ─────────────────────────────────────────────────────────────

  async requestUploadUrl(dto: RequestDocumentUploadUrlDto, currentUser: JwtPayload) {
    const patientId = this.requirePatientId(currentUser);

    await this.storageService.assertUploadAllowed(patientId, dto.sizeBytes);

    const ext = DOCUMENT_MIME_TO_EXT[dto.contentType] ?? 'bin';
    const objectKey = `records/${currentUser.sub}/${randomUUID()}.${ext}`;

    const uploadUrl = await this.s3Service.presignPut(
      objectKey,
      dto.contentType,
      dto.sizeBytes,
      { uploadedBy: currentUser.sub },
    );

    return { uploadUrl, objectKey, expiresIn: PRESIGNED_UPLOAD_EXPIRY_SECONDS };
  }

  // ── Create (finalize) ─────────────────────────────────────────────────────

  async create(dto: CreateDocumentDto, currentUser: JwtPayload) {
    const patientId = this.requirePatientId(currentUser);

    this.assertOwnedObjectKey(dto.objectKey, currentUser);

    const existing = await this.prisma.clinicalRecord.findFirst({
      where: { fileUrl: dto.objectKey },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('File already registered');
    }

    const head = await this.headObjectOrThrow(dto.objectKey);
    if (head.contentLength <= 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    try {
      await this.storageService.assertUploadAllowed(patientId, head.contentLength);
    } catch (err) {
      if (err instanceof PaymentRequiredException) {
        await this.bestEffortDelete(dto.objectKey);
      }
      throw err;
    }

    const created = await this.prisma.clinicalRecord.create({
      data: {
        hhaRef: await generateRecordRef(this.prisma),
        patientId,
        recordType: 'document',
        title: dto.title?.trim() || dto.fileName,
        description: dto.description,
        fileUrl: dto.objectKey,
        fileMimeType: head.contentType ?? 'application/octet-stream',
        fileSizeBytes: head.contentLength,
        recordedAt: dto.documentDate ? new Date(dto.documentDate) : new Date(),
        category: dto.category,
        tags: dto.tags ?? [],
        originalFileName: dto.fileName,
        source: 'patient_upload',
        providerVisibility: true,
        isDownloadable: true,
      },
      select: this.documentSelect(),
    });

    return created;
  }

  // ── List ───────────────────────────────────────────────────────────────────

  async findMany(query: QueryDocumentsDto, currentUser: JwtPayload) {
    const patientId = this.requirePatientId(currentUser);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const sort = query.sort ?? 'createdAt';
    const order = query.order ?? 'desc';

    const where: Prisma.ClinicalRecordWhereInput = {
      patientId,
      source: 'patient_upload',
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            recordedAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
              { tags: { has: query.q } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.clinicalRecord.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: this.documentSelect(),
      }),
      this.prisma.clinicalRecord.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize } };
  }

  // ── Get one ────────────────────────────────────────────────────────────────

  async findOne(id: string, currentUser: JwtPayload) {
    return this.findOwnedDocumentOrThrow(id, currentUser);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateDocumentDto, currentUser: JwtPayload) {
    await this.findOwnedDocumentOrThrow(id, currentUser);

    return this.prisma.clinicalRecord.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        ...(dto.documentDate !== undefined ? { recordedAt: new Date(dto.documentDate) } : {}),
        ...(dto.providerVisibility !== undefined
          ? { providerVisibility: dto.providerVisibility }
          : {}),
      },
      select: this.documentSelect(),
    });
  }

  // ── Replace ────────────────────────────────────────────────────────────────

  async requestReplaceUrl(
    id: string,
    dto: RequestDocumentUploadUrlDto,
    currentUser: JwtPayload,
  ) {
    const patientId = this.requirePatientId(currentUser);
    const doc = await this.findOwnedDocumentOrThrow(id, currentUser);

    await this.storageService.assertUploadAllowed(patientId, dto.sizeBytes, {
      replacingBytes: doc.fileSizeBytes ?? 0,
    });

    const ext = DOCUMENT_MIME_TO_EXT[dto.contentType] ?? 'bin';
    const objectKey = `records/${currentUser.sub}/${randomUUID()}.${ext}`;

    const uploadUrl = await this.s3Service.presignPut(
      objectKey,
      dto.contentType,
      dto.sizeBytes,
      { uploadedBy: currentUser.sub },
    );

    return { uploadUrl, objectKey, expiresIn: PRESIGNED_UPLOAD_EXPIRY_SECONDS };
  }

  async replace(id: string, dto: ReplaceDocumentDto, currentUser: JwtPayload) {
    const patientId = this.requirePatientId(currentUser);
    const doc = await this.findOwnedDocumentOrThrow(id, currentUser);

    this.assertOwnedObjectKey(dto.objectKey, currentUser);

    const existing = await this.prisma.clinicalRecord.findFirst({
      where: { fileUrl: dto.objectKey },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('File already registered');
    }

    const head = await this.headObjectOrThrow(dto.objectKey);
    if (head.contentLength <= 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    try {
      await this.storageService.assertUploadAllowed(patientId, head.contentLength, {
        replacingBytes: doc.fileSizeBytes ?? 0,
      });
    } catch (err) {
      if (err instanceof PaymentRequiredException) {
        await this.bestEffortDelete(dto.objectKey);
      }
      throw err;
    }

    const oldKey = doc.fileUrl;

    const updated = await this.prisma.clinicalRecord.update({
      where: { id },
      data: {
        fileUrl: dto.objectKey,
        fileMimeType: head.contentType ?? 'application/octet-stream',
        fileSizeBytes: head.contentLength,
        originalFileName: dto.fileName,
      },
      select: this.documentSelect(),
    });

    if (oldKey) {
      await this.bestEffortDelete(oldKey);
    }

    return updated;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async remove(id: string, currentUser: JwtPayload) {
    const doc = await this.findOwnedDocumentOrThrow(id, currentUser);

    await this.prisma.clinicalRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (doc.fileUrl) {
      await this.bestEffortDelete(doc.fileUrl);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private requirePatientId(currentUser: JwtPayload): string {
    if (!currentUser.patientId) {
      throw new ForbiddenException('Patient profile required');
    }
    return currentUser.patientId;
  }

  // Object keys are namespaced by the uploading user's sub so records'
  // existing download-url authorization (which resolves fileUrl -> owning
  // patient) keeps working unmodified for documents.
  private assertOwnedObjectKey(objectKey: string, currentUser: JwtPayload): void {
    if (!objectKey.startsWith(`records/${currentUser.sub}/`)) {
      throw new ForbiddenException('Object key does not belong to the current user');
    }
  }

  private async headObjectOrThrow(objectKey: string) {
    try {
      return await this.s3Service.headObject(objectKey);
    } catch (err: any) {
      const isNotFound =
        err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404;
      if (isNotFound) {
        throw new BadRequestException(
          'File not found in storage — upload may have failed or expired',
        );
      }
      throw err;
    }
  }

  private async bestEffortDelete(objectKey: string): Promise<void> {
    try {
      await this.s3Service.deleteObject(objectKey);
    } catch (err) {
      this.logger.warn(
        `Failed to delete object ${objectKey} from storage: ${(err as Error).message}`,
      );
    }
  }

  private async findOwnedDocumentOrThrow(id: string, currentUser: JwtPayload) {
    const patientId = this.requirePatientId(currentUser);

    const doc = await this.prisma.clinicalRecord.findFirst({
      where: {
        id,
        patientId,
        source: 'patient_upload',
        deletedAt: null,
      },
      select: { ...this.documentSelect(), fileUrl: true, fileSizeBytes: true },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    return doc;
  }

  private documentSelect() {
    return {
      id: true,
      hhaRef: true,
      recordType: true,
      title: true,
      description: true,
      category: true,
      tags: true,
      originalFileName: true,
      source: true,
      fileUrl: true,
      fileMimeType: true,
      fileSizeBytes: true,
      providerVisibility: true,
      recordedAt: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}

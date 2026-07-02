import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DocumentsService } from './documents.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { RequestDocumentUploadUrlDto } from './dto/request-document-upload-url.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ReplaceDocumentDto } from './dto/replace-document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // Same rationale as records: each presign authorises an S3 PUT, so 30/min
  // allows bulk uploads while blocking scripted abuse.
  @Post('upload-url')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Request a pre-signed S3 upload URL for a vault document' })
  async requestUploadUrl(
    @Body() dto: RequestDocumentUploadUrlDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return { data: await this.documentsService.requestUploadUrl(dto, user) };
  }

  @Post()
  @ApiOperation({ summary: 'Finalize an upload — verify the object and create the document' })
  async create(@Body() dto: CreateDocumentDto, @CurrentUser() user: JwtPayload) {
    return { data: await this.documentsService.create(dto, user) };
  }

  @Get()
  @ApiOperation({ summary: 'List own vault documents (search, filter, sort, paginate)' })
  findMany(@Query() query: QueryDocumentsDto, @CurrentUser() user: JwtPayload) {
    return this.documentsService.findMany(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vault document by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return { data: await this.documentsService.findOne(id, user) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata (rename, categorize, tag, visibility)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return { data: await this.documentsService.update(id, dto, user) };
  }

  @Post(':id/replace-url')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Request a pre-signed URL to replace an existing document file' })
  async requestReplaceUrl(
    @Param('id') id: string,
    @Body() dto: RequestDocumentUploadUrlDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return { data: await this.documentsService.requestReplaceUrl(id, dto, user) };
  }

  @Post(':id/replace')
  @ApiOperation({ summary: 'Finalize a replacement — swap the stored file, delete the old one' })
  async replace(
    @Param('id') id: string,
    @Body() dto: ReplaceDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return { data: await this.documentsService.replace(id, dto, user) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a vault document (soft-delete record, remove stored file)' })
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.documentsService.remove(id, user);
  }
}

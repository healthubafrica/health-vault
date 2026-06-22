import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as sanitizeHtml from 'sanitize-html';
import slugify from 'slugify';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { RequestCmsUploadUrlDto } from './dto/request-cms-upload-url.dto';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
    'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'hr',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
  },
  allowedSchemes: ['http', 'https'],
};

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class CmsService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'us-east-1'),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
      endpoint: config.get('S3_ENDPOINT'),
    });
    this.bucket = config.getOrThrow('S3_BUCKET');
  }

  // ── Asset uploads (cover images, author photos) ─────────────────────────

  async requestAssetUploadUrl(dto: RequestCmsUploadUrlDto, currentUser: JwtPayload) {
    const ext = MIME_TO_EXT[dto.contentType] ?? 'bin';
    const objectKey = `cms-assets/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: dto.contentType,
      ContentLength: dto.sizeBytes,
      Metadata: { uploadedBy: currentUser.sub },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 600 });
    const region = this.config.get('AWS_REGION', 'us-east-1');
    const publicUrl = `https://${this.bucket}.s3.${region}.amazonaws.com/${objectKey}`;

    return { uploadUrl, objectKey, publicUrl };
  }

  // ── Blog: slug helper ────────────────────────────────────────────────────

  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    let candidate = base;
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.blogPost.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }

  // ── Blog: public ─────────────────────────────────────────────────────────

  async listPublishedBlogPosts(page = 1, limit = 20, category?: string) {
    const skip = (page - 1) * limit;
    const where: any = { status: ContentStatus.published, deletedAt: null };
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async getPublishedBlogPostBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: ContentStatus.published, deletedAt: null },
    });
    if (!post) throw new NotFoundException('Post not found');
    return { data: post };
  }

  // ── Blog: admin ──────────────────────────────────────────────────────────

  async listAllBlogPosts(page = 1, limit = 20, status?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async getBlogPost(id: string) {
    const post = await this.prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundException('Post not found');
    return { data: post };
  }

  async createBlogPost(dto: CreateBlogPostDto, currentUser: JwtPayload) {
    const slug = dto.slug
      ? await this.generateUniqueSlug(dto.slug)
      : await this.generateUniqueSlug(dto.title);
    const status = dto.status ?? ContentStatus.draft;

    const post = await this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        bodyHtml: sanitizeHtml(dto.bodyHtml, SANITIZE_OPTIONS),
        coverImageUrl: dto.coverImageUrl,
        category: dto.category,
        tags: dto.tags ?? [],
        status,
        publishedAt: status === ContentStatus.published ? new Date() : null,
        authorName: dto.authorName,
        authorTitle: dto.authorTitle,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        readMinutes: dto.readMinutes,
        createdById: currentUser.sub,
      },
    });

    return { data: post };
  }

  async updateBlogPost(id: string, dto: UpdateBlogPostDto) {
    const existing = await this.prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Post not found');

    const slug = dto.slug ? await this.generateUniqueSlug(dto.slug, id) : undefined;
    const becamePublished =
      dto.status === ContentStatus.published && existing.status !== ContentStatus.published;

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(slug !== undefined && { slug }),
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(dto.bodyHtml !== undefined && { bodyHtml: sanitizeHtml(dto.bodyHtml, SANITIZE_OPTIONS) }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(becamePublished && { publishedAt: new Date() }),
        ...(dto.authorName !== undefined && { authorName: dto.authorName }),
        ...(dto.authorTitle !== undefined && { authorTitle: dto.authorTitle }),
        ...(dto.seoTitle !== undefined && { seoTitle: dto.seoTitle }),
        ...(dto.seoDescription !== undefined && { seoDescription: dto.seoDescription }),
        ...(dto.readMinutes !== undefined && { readMinutes: dto.readMinutes }),
      },
    });

    return { data: post };
  }

  async deleteBlogPost(id: string) {
    const existing = await this.prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Post not found');

    await this.prisma.blogPost.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Post deleted' };
  }

  // ── Testimonials: public ─────────────────────────────────────────────────

  async listPublishedTestimonials() {
    const data = await this.prisma.testimonial.findMany({
      where: { status: ContentStatus.published },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
    return { data };
  }

  // ── Testimonials: admin ──────────────────────────────────────────────────

  async listAllTestimonials(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.testimonial.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testimonial.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async createTestimonial(dto: CreateTestimonialDto) {
    const testimonial = await this.prisma.testimonial.create({
      data: {
        authorName: dto.authorName,
        authorTitle: dto.authorTitle,
        authorCompany: dto.authorCompany,
        authorPhotoUrl: dto.authorPhotoUrl,
        quote: dto.quote,
        rating: dto.rating ?? 5,
        isFeatured: dto.isFeatured ?? false,
        status: dto.status ?? ContentStatus.draft,
        serviceType: dto.serviceType,
      },
    });
    return { data: testimonial };
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');

    const testimonial = await this.prisma.testimonial.update({
      where: { id },
      data: {
        ...(dto.authorName !== undefined && { authorName: dto.authorName }),
        ...(dto.authorTitle !== undefined && { authorTitle: dto.authorTitle }),
        ...(dto.authorCompany !== undefined && { authorCompany: dto.authorCompany }),
        ...(dto.authorPhotoUrl !== undefined && { authorPhotoUrl: dto.authorPhotoUrl }),
        ...(dto.quote !== undefined && { quote: dto.quote }),
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.serviceType !== undefined && { serviceType: dto.serviceType }),
      },
    });
    return { data: testimonial };
  }

  async deleteTestimonial(id: string) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');

    await this.prisma.testimonial.delete({ where: { id } });
    return { message: 'Testimonial deleted' };
  }
}

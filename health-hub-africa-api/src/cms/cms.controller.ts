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
import { UserRole } from '@prisma/client';
import { CmsService } from './cms.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { RequestCmsUploadUrlDto } from './dto/request-cms-upload-url.dto';
import { Roles, Public } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

// ── Public: consumed by the marketing site (myvaultplus-web) ────────────────

@ApiTags('CMS — Public')
@Public()
@Roles()
@Controller('cms')
export class CmsPublicController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('blog')
  @ApiOperation({ summary: 'List published blog posts' })
  listBlogPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    return this.cmsService.listPublishedBlogPosts(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      category,
    );
  }

  @Get('blog/:slug')
  @ApiOperation({ summary: 'Get a published blog post by slug' })
  getBlogPost(@Param('slug') slug: string) {
    return this.cmsService.getPublishedBlogPostBySlug(slug);
  }

  @Get('testimonials')
  @ApiOperation({ summary: 'List published testimonials' })
  listTestimonials() {
    return this.cmsService.listPublishedTestimonials();
  }
}

// ── Admin: content authoring ─────────────────────────────────────────────────

@ApiTags('CMS — Admin')
@ApiBearerAuth()
@Roles(UserRole.admin, UserRole.super_admin)
@Controller('admin/cms')
export class CmsAdminController {
  constructor(private readonly cmsService: CmsService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Request a presigned S3 upload URL for a CMS image asset' })
  requestUploadUrl(@Body() dto: RequestCmsUploadUrlDto, @CurrentUser() user: JwtPayload) {
    return this.cmsService.requestAssetUploadUrl(dto, user);
  }

  // ── Blog ──────────────────────────────────────────────────────────────────

  @Get('blog')
  @ApiOperation({ summary: 'List all blog posts including drafts' })
  listBlogPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.cmsService.listAllBlogPosts(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
      search,
    );
  }

  @Get('blog/:id')
  @ApiOperation({ summary: 'Get a single blog post by id' })
  getBlogPost(@Param('id') id: string) {
    return this.cmsService.getBlogPost(id);
  }

  @Post('blog')
  @ApiOperation({ summary: 'Create a blog post' })
  createBlogPost(@Body() dto: CreateBlogPostDto, @CurrentUser() user: JwtPayload) {
    return this.cmsService.createBlogPost(dto, user);
  }

  @Patch('blog/:id')
  @ApiOperation({ summary: 'Update a blog post' })
  updateBlogPost(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.cmsService.updateBlogPost(id, dto);
  }

  @Delete('blog/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a blog post' })
  deleteBlogPost(@Param('id') id: string) {
    return this.cmsService.deleteBlogPost(id);
  }

  // ── Testimonials ──────────────────────────────────────────────────────────

  @Get('testimonials')
  @ApiOperation({ summary: 'List all testimonials including drafts' })
  listTestimonials(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.cmsService.listAllTestimonials(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Post('testimonials')
  @ApiOperation({ summary: 'Create a testimonial' })
  createTestimonial(@Body() dto: CreateTestimonialDto) {
    return this.cmsService.createTestimonial(dto);
  }

  @Patch('testimonials/:id')
  @ApiOperation({ summary: 'Update a testimonial' })
  updateTestimonial(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.cmsService.updateTestimonial(id, dto);
  }

  @Delete('testimonials/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a testimonial' })
  deleteTestimonial(@Param('id') id: string) {
    return this.cmsService.deleteTestimonial(id);
  }
}

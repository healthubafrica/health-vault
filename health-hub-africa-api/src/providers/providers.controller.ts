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
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { QueryProvidersDto } from './dto/query-providers.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Providers')
@ApiBearerAuth()
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @Roles(UserRole.provider)
  @ApiOperation({ summary: 'Create provider profile for the authenticated user' })
  create(@Body() dto: CreateProviderDto, @CurrentUser() user: JwtPayload) {
    return this.providersService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List providers (public-facing filtered directory)' })
  findAll(@Query() query: QueryProvidersDto) {
    return this.providersService.findAll(query);
  }

  @Get('me')
  @Roles(UserRole.provider)
  @ApiOperation({ summary: "Get the authenticated user's provider profile" })
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.providersService.findMyProfile(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a provider by ID' })
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a provider profile' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.providersService.update(id, dto, user);
  }

  @Patch(':id/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Verify a provider account (admin only)' })
  verify(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.providersService.verify(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin, UserRole.super_admin)
  @ApiOperation({ summary: 'Deactivate a provider account (admin only)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.providersService.remove(id, user);
  }
}

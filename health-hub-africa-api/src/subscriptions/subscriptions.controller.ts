import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/roles.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'List all available subscription plans' })
  findPlans() {
    return this.subscriptionsService.findPlans();
  }

  @Public()
  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a subscription plan by ID' })
  findPlan(@Param('id') id: string) {
    return this.subscriptionsService.findPlan(id);
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Subscribe to a plan' })
  subscribe(@Body() dto: SubscribeDto, @CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.subscribe(dto, user);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current active subscription' })
  getMySubscription(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.findMySubscription(user);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a subscription' })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.cancelSubscription(id, user);
  }
}

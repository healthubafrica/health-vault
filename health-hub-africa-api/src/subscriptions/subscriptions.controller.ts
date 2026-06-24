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
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'List all available subscription plans' })
  async findPlans() {
    return { data: await this.subscriptionsService.findPlans() };
  }

  @Public()
  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a subscription plan by ID' })
  async findPlan(@Param('id') id: string) {
    return { data: await this.subscriptionsService.findPlan(id) };
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Subscribe to a plan (admin or Free plan only)' })
  async subscribe(@Body() dto: SubscribeDto, @CurrentUser() user: JwtPayload) {
    return { data: await this.subscriptionsService.subscribe(dto, user) };
  }

  @ApiBearerAuth()
  @Post('upgrade')
  @ApiOperation({
    summary: 'Upgrade to a paid plan via payment gateway',
    description:
      'Creates a pending Payment and returns the Paystack/Flutterwave authorization URL. ' +
      'The webhook activates the subscription on successful payment.',
  })
  async upgrade(@Body() dto: UpgradeSubscriptionDto, @CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.upgrade(dto, user);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current active subscription' })
  async getMySubscription(@CurrentUser() user: JwtPayload) {
    return { data: await this.subscriptionsService.findMySubscription(user) };
  }

  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a subscription' })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.cancelSubscription(id, user);
  }
}

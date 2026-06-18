import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../common/decorators/roles.decorator';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Each initiation creates a record with the upstream PSP (Paystack /
  // Flutterwave). Legitimate users retry on failure but rarely more than a
  // few times in a minute; 10/min blocks scripted enumeration / card-testing.
  @ApiBearerAuth()
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Initiate a payment' })
  initiate(@Body() dto: InitiatePaymentDto, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.initiate(dto, user);
  }

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List my payments' })
  findMyPayments(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.findMyPayments(user);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get a payment record' })
  findPayment(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.findPayment(id, user);
  }

  @Public()
  @SkipThrottle()
  @Post('webhooks/paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook receiver' })
  paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentsService.handlePaystackWebhook(req.rawBody!, signature);
  }

  @Public()
  @SkipThrottle()
  @Post('webhooks/flutterwave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flutterwave webhook receiver' })
  flutterwaveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('verif-hash') signature: string,
  ) {
    return this.paymentsService.handleFlutterwaveWebhook(req.rawBody!, signature);
  }
}

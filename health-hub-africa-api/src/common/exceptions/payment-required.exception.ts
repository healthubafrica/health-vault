import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentRequiredException extends HttpException {
  constructor(message: string) {
    super({ statusCode: 402, message }, HttpStatus.PAYMENT_REQUIRED);
  }
}

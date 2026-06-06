import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.route?.path ?? 'unknown'} — ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      Sentry.captureException(exception, {
        extra: {
          method: request.method,
          route: request.route?.path ?? 'unknown',
          statusCode: status,
        },
      });
    }

    // SEC-007: never include the full request URL (which may contain query
    // params with IDs or tokens). Use only the static route pattern.
    response.status(status).json({
      success: false,
      statusCode: status,
      message:
        typeof message === 'object' && 'message' in (message as object)
          ? (message as { message: string }).message
          : message,
      timestamp: new Date().toISOString(),
    });
  }
}

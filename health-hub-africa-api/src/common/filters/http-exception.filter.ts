import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // ── Prisma known errors → meaningful HTTP responses ───────────────────
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        // Unique constraint violation → 409 Conflict
        const fields = (exception.meta?.target as string[]) ?? [];
        const field = fields.length ? fields.join(', ') : 'field';
        return response.status(HttpStatus.CONFLICT).json({
          success: false,
          statusCode: HttpStatus.CONFLICT,
          message: `A record with this ${field} already exists`,
          timestamp: new Date().toISOString(),
        });
      }

      if (exception.code === 'P2025') {
        // Record not found (e.g. update/delete on non-existent row) → 404
        return response.status(HttpStatus.NOT_FOUND).json({
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          timestamp: new Date().toISOString(),
        });
      }
    }

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

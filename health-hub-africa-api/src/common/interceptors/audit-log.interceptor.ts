import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../decorators/current-user.decorator';

const STATE_CHANGE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const PHI_FIELDS = new Set([
  'passwordHash',
  'password',
  'password_hash',
  'refreshToken',
  'token',
]);

function stripPhi(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !PHI_FIELDS.has(key)),
  );
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    if (!STATE_CHANGE_METHODS.has(req.method)) return next.handle();

    const user = req.user as JwtPayload | undefined;
    // SEC-012: with trust proxy enabled, req.ip is already the real client IP.
    // Use it directly; do not fall back to the raw x-forwarded-for header which
    // can contain a comma-separated list of proxy hops.
    const ipAddress = req.ip ?? null;
    const userAgent = req.headers['user-agent'];
    const resourceType = this.deriveResourceType(req.path);

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          await this.prisma.auditLog.create({
            data: {
              actorId: user?.sub ?? null,
              patientId: user?.patientId ?? null,
              action: `${req.method.toLowerCase()}.${resourceType}`,
              resourceType,
              resourceId: responseBody?.data?.id ?? responseBody?.id ?? req.params?.id ?? null,
              ipAddress,
              userAgent,
              metadata: stripPhi(req.body ?? {}) as Prisma.InputJsonValue,
              severity: 'info',
            },
          });
        } catch {
          // Audit log failures must never break the primary request
        }
      }),
    );
  }

  private deriveResourceType(path: string): string {
    // Every route is prefixed /api/{version}/{resource}/... by the global URI
    // versioning config — segments[1] was always the literal version string
    // (e.g. "v1"), so every audit log entry recorded action="post.v1" /
    // resourceType="v1" regardless of what was actually touched. segments[2]
    // is the real resource. Falls back gracefully for any unversioned route.
    const segments = path.split('/').filter(Boolean);
    return segments[2] ?? segments[1] ?? segments[0] ?? 'unknown';
  }
}

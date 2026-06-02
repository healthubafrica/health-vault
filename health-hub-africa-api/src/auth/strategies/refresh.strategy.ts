import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromHeader('x-refresh-token'),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.headers['x-refresh-token'] as string;
    if (!refreshToken) throw new UnauthorizedException('No refresh token');

    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: { select: { id: true, role: true, isActive: true, deletedAt: true, patient: { select: { id: true } }, provider: { select: { id: true } } } } },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      !session.user.isActive ||
      session.user.deletedAt
    ) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    return {
      sub: session.user.id,
      email: payload.email,
      role: session.user.role,
      patientId: session.user.patient?.id,
      providerId: session.user.provider?.id,
      sessionId: session.id,
      refreshToken,
    };
  }
}

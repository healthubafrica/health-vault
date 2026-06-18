import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

// Track authenticated users by their user id instead of source IP. Shared
// public networks (hospitals, mobile hotspots, corporate NATs) commonly route
// many distinct users through one IP; the default per-IP tracker would lock
// the whole network out as soon as one device misbehaves.
//
// For anonymous traffic (no JWT yet — register, login, etc.) we keep the IP
// tracker since there's no user identity to key on.
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    const user = (req as Request & { user?: { sub?: string } }).user;
    return Promise.resolve(user?.sub ?? req.ip ?? 'unknown');
  }
}

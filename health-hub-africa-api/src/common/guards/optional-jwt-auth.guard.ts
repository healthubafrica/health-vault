import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// For @Public() routes that should still attribute the caller when a valid
// bearer token is present. A missing/expired/invalid token degrades to
// anonymous instead of 401, and identity only ever comes from the verified
// JWT, never from request input.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(_err: any, user: any): TUser {
    return (user || undefined) as TUser;
  }
}

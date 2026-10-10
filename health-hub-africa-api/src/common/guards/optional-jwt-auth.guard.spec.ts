import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard.handleRequest', () => {
  const guard = new OptionalJwtAuthGuard();

  it('returns the authenticated user when the token is valid', () => {
    const user = { sub: 'u1' };
    expect(guard.handleRequest(null, user)).toBe(user);
  });

  it('returns undefined (anonymous) when there is no token', () => {
    expect(guard.handleRequest(null, false)).toBeUndefined();
  });

  it('returns undefined instead of throwing for an expired/invalid token', () => {
    expect(guard.handleRequest(new Error('jwt expired'), false)).toBeUndefined();
  });
});

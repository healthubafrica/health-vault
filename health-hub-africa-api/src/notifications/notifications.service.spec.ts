import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { NotificationsService } from './notifications.service';

// verifyResendWebhookSignature only touches ConfigService, so these tests
// construct the service directly with minimal stand-ins rather than a full
// Nest TestingModule (Prisma/rate-limiter/queue are never exercised here).
function buildService(secret: string | undefined) {
  const config = { get: (key: string) => (key === 'RESEND_WEBHOOK_SECRET' ? secret : undefined) };
  return new NotificationsService(
    config as any,
    {} as any,
    {} as any,
    {} as any,
  );
}

function sign(secret: string, id: string, timestamp: string, body: string): string {
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signedContent = `${id}.${timestamp}.${body}`;
  const sig = createHmac('sha256', secretBytes).update(signedContent).digest('base64');
  return `v1,${sig}`;
}

describe('NotificationsService.verifyResendWebhookSignature', () => {
  const secret = `whsec_${Buffer.from('test-signing-secret').toString('base64')}`;
  const id = 'msg_test123';
  const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_abc123' } });

  it('accepts a correctly signed payload', () => {
    const service = buildService(secret);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = sign(secret, id, timestamp, body);
    expect(() =>
      service.verifyResendWebhookSignature(Buffer.from(body), id, timestamp, signature),
    ).not.toThrow();
  });

  it('rejects a tampered body', () => {
    const service = buildService(secret);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = sign(secret, id, timestamp, body);
    const tamperedBody = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_evil' } });
    expect(() =>
      service.verifyResendWebhookSignature(Buffer.from(tamperedBody), id, timestamp, signature),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a signature from a different secret', () => {
    const service = buildService(secret);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const wrongSecret = `whsec_${Buffer.from('wrong-secret').toString('base64')}`;
    const signature = sign(wrongSecret, id, timestamp, body);
    expect(() =>
      service.verifyResendWebhookSignature(Buffer.from(body), id, timestamp, signature),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a stale timestamp outside the 5 minute tolerance', () => {
    const service = buildService(secret);
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600);
    const signature = sign(secret, id, staleTimestamp, body);
    expect(() =>
      service.verifyResendWebhookSignature(Buffer.from(body), id, staleTimestamp, signature),
    ).toThrow(UnauthorizedException);
  });

  it('rejects when headers are missing', () => {
    const service = buildService(secret);
    expect(() =>
      service.verifyResendWebhookSignature(Buffer.from(body), undefined, undefined, undefined),
    ).toThrow(UnauthorizedException);
  });

  it('rejects when RESEND_WEBHOOK_SECRET is not configured', () => {
    const service = buildService(undefined);
    const timestamp = String(Math.floor(Date.now() / 1000));
    expect(() =>
      service.verifyResendWebhookSignature(Buffer.from(body), id, timestamp, 'v1,anything'),
    ).toThrow(UnauthorizedException);
  });
});

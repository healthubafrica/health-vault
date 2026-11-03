import { UserRole } from '@prisma/client';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { SystemStatusService, worst } from './system-status.service';

const queue = (name: string, waiting = 0, failedRecently = 0) => ({
  name,
  getJobCounts: jest.fn().mockResolvedValue({ waiting }),
  getFailed: jest.fn().mockResolvedValue(Array.from({ length: failedRecently }, () => ({ finishedOn: Date.now() }))),
});

function build(over: { alarms?: string[]; spend?: string; redisPing?: () => Promise<string>; syncFailed?: number; notif?: any[] } = {}) {
  const prisma: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    openemrSyncQueue: {
      count: jest.fn(({ where }) => Promise.resolve(where.status === 'failed' ? over.syncFailed ?? 0 : 2)),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    integrationError: { groupBy: jest.fn().mockResolvedValue([]) },
    notificationDelivery: { groupBy: jest.fn().mockResolvedValue(over.notif ?? []) },
    payment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
  };
  const openemr: any = { getAccessToken: jest.fn().mockResolvedValue('tok') };
  const config: any = { get: (k: string, d: unknown) => ({ OPENEMR_BASE_URL: 'https://emr.test' } as any)[k] ?? d };
  const redis: any = { ping: jest.fn(over.redisPing ?? (() => Promise.resolve('PONG'))) };
  jest.spyOn(CloudWatchClient.prototype, 'send').mockImplementation(async () => ({
    MetricAlarms: (over.alarms ?? []).map((AlarmName) => ({ AlarmName })),
  }));
  jest.spyOn(CostExplorerClient.prototype, 'send').mockImplementation(async () => ({
    ResultsByTime: [{ Total: { UnblendedCost: { Amount: over.spend ?? '100' } } }],
  }));
  const qs = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((n) => queue(n));
  const service = new SystemStatusService(prisma, openemr, config, redis, ...(qs as [any, any, any, any, any, any, any]));
  return { service, prisma, qs };
}

const check = (s: { checks: { key: string }[] }, key: string) => s.checks.find((c) => c.key === key) as any;

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as any;
  delete process.env.ECS_CONTAINER_METADATA_URI_V4;
});
afterEach(() => jest.restoreAllMocks());

describe('worst', () => {
  it('ranks down > warn > unknown > ok', () => {
    expect(worst([])).toBe('ok');
    expect(worst(['ok', 'unknown'])).toBe('unknown');
    expect(worst(['unknown', 'warn', 'ok'])).toBe('warn');
    expect(worst(['warn', 'down'])).toBe('down');
  });
});

describe('SystemStatusService', () => {
  it('reports all ok when everything is healthy', async () => {
    const { service } = build();
    const s = await service.getStatus(UserRole.super_admin);
    expect(s.overall).toBe('ok');
    expect(s.checks.map((c) => c.key)).toContain('spend');
  });

  it('hides spend from admins and leaves it out of overall', async () => {
    const { service } = build({ spend: '500' }); // over the $350 default budget → down
    expect((await service.getStatus(UserRole.super_admin)).overall).toBe('down');
    const admin = await service.getStatus(UserRole.admin);
    expect(check(admin, 'spend')).toBeUndefined();
    expect(admin.overall).toBe('ok');
  });

  it('grades spend against the budget', async () => {
    const { service } = build({ spend: '300' }); // 86% of 350
    expect(check(await service.getStatus(UserRole.super_admin), 'spend').status).toBe('warn');
  });

  it('marks a firing CloudWatch alarm as down and names it', async () => {
    const { service } = build({ alarms: ['RDS CPU High'] });
    const c = check(await service.getStatus(UserRole.admin), 'aws-alarms');
    expect(c.status).toBe('down');
    expect(c.detail).toContain('RDS CPU High');
  });

  it('turns a hung dependency into unknown instead of hanging the page', async () => {
    jest.useFakeTimers();
    try {
      const { service } = build({ redisPing: () => new Promise(() => undefined) });
      const pending = service.getStatus(UserRole.admin);
      await jest.advanceTimersByTimeAsync(3_100);
      const s = await pending;
      expect(check(s, 'redis').status).toBe('unknown');
      expect(check(s, 'database').status).toBe('ok');
    } finally {
      jest.useRealTimers();
    }
  });

  it('flags OpenEMR down when sign-in fails even though the server answers', async () => {
    const { service } = build();
    (service as any).openemr.getAccessToken.mockRejectedValue(new Error('OpenEMR not authenticated'));
    const c = check(await service.getStatus(UserRole.admin), 'openemr');
    expect(c.status).toBe('down');
    expect(c.detail).toContain('sign-in failing');
  });

  it('warns on recent failed jobs and failed sync items', async () => {
    const { service, qs } = build({ syncFailed: 3 });
    qs[1].getFailed.mockResolvedValue([{ finishedOn: Date.now() }, { finishedOn: Date.now() - 2 * 86_400_000 }]);
    const s = await service.getStatus(UserRole.admin);
    expect(check(s, 'jobs')).toMatchObject({ status: 'warn', detail: 'b: 1 failed, 0 waiting' });
    expect(check(s, 'sync').status).toBe('warn');
  });

  it('grades notification failure rate per channel', async () => {
    const { service } = build({
      notif: [
        { channel: 'email', status: 'delivered', _count: { _all: 70 } },
        { channel: 'email', status: 'failed', _count: { _all: 30 } },
        { channel: 'sms', status: 'sent', _count: { _all: 10 } },
      ],
    });
    const c = check(await service.getStatus(UserRole.admin), 'notifications');
    expect(c.status).toBe('down'); // email 30% failed
    expect(c.detail).toBe('email: 70 sent, 30 failed · sms: 10 sent, 0 failed');
  });

  it('caches results for 30s', async () => {
    const { service, prisma } = build();
    await service.getStatus(UserRole.admin);
    await service.getStatus(UserRole.admin);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});

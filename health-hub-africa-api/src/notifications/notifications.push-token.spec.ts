import { NotificationsService } from './notifications.service';

function build(overrides: { prisma?: any; queue?: any; limiter?: any } = {}) {
  const prisma = overrides.prisma ?? {};
  const queue = overrides.queue ?? { add: jest.fn() };
  const limiter = overrides.limiter ?? { allow: jest.fn().mockResolvedValue(true) };
  const service = new NotificationsService({ get: () => undefined } as any, limiter as any, prisma as any, queue as any);
  return { service, prisma, queue };
}

describe('NotificationsService push tokens', () => {
  it('upserts a token by value so a re-installed app re-binds it to the current user', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 't1' });
    const { service } = build({ prisma: { deviceToken: { upsert } } });

    await service.registerPushToken('user-1', { token: 'tok-abc', platform: 'android' });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'tok-abc' },
        create: expect.objectContaining({ userId: 'user-1', token: 'tok-abc', platform: 'android' }),
        update: expect.objectContaining({ userId: 'user-1', platform: 'android' }),
      }),
    );
  });

  it('only removes a token that belongs to the caller', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const { service } = build({ prisma: { deviceToken: { deleteMany } } });

    await service.unregisterPushToken('user-1', 'tok-abc');

    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', token: 'tok-abc' } });
  });

  it('sends one push job per registered device when push is allowed', async () => {
    const prisma = {
      notificationPreference: { findUnique: jest.fn().mockResolvedValue({ pushEnabled: true }) },
      deviceToken: { findMany: jest.fn().mockResolvedValue([{ token: 'a' }, { token: 'b' }]) },
      notificationDelivery: { create: jest.fn().mockResolvedValue({ id: 'd1' }) },
    };
    const { service, queue } = build({ prisma });

    await service.pushToUser('user-1', 'Lab result', 'Your result is ready');

    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add.mock.calls[0][0]).toBe('send-push');
  });

  it('sends nothing when the user turned push off', async () => {
    const prisma = {
      notificationPreference: { findUnique: jest.fn().mockResolvedValue({ pushEnabled: false }) },
      deviceToken: { findMany: jest.fn() },
    };
    const { service, queue } = build({ prisma });

    await service.pushToUser('user-1', 'x', 'y');

    expect(queue.add).not.toHaveBeenCalled();
    expect(prisma.deviceToken.findMany).not.toHaveBeenCalled();
  });

  it('never throws into the caller when push delivery setup fails', async () => {
    const prisma = {
      notificationPreference: { findUnique: jest.fn().mockRejectedValue(new Error('db down')) },
    };
    const { service } = build({ prisma });

    await expect(service.pushToUser('user-1', 'x', 'y')).resolves.toBeUndefined();
  });
});

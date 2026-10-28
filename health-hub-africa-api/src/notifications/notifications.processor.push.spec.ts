import { NotificationsProcessor } from './notifications.processor';

describe('NotificationsProcessor.handlePush — Expo tokens (iOS)', () => {
  const update = jest.fn().mockResolvedValue({});
  const prisma = { notificationDelivery: { update } } as never;
  const config = { get: jest.fn().mockReturnValue(undefined) } as never;
  const job = (to: string) => ({ data: { to, subject: 'Hi', body: 'Body', deliveryId: 'd1' }, opts: { attempts: 3 }, attemptsMade: 0 }) as never;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as never;
  });

  it('relays ExponentPushToken through Expo without needing Firebase credentials', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'ok' } }) });

    await new NotificationsProcessor(config, prisma).handlePush(job('ExponentPushToken[abc]'));

    expect(fetchMock).toHaveBeenCalledWith('https://exp.host/--/api/v2/push/send', expect.objectContaining({ method: 'POST' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'sent' }) }));
  });

  it('fails the job when Expo rejects the ticket despite HTTP 200', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'error', message: 'DeviceNotRegistered' } }) });

    await expect(new NotificationsProcessor(config, prisma).handlePush(job('ExponentPushToken[abc]'))).rejects.toThrow('DeviceNotRegistered');
  });
});

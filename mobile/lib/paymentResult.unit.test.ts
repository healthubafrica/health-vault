import { settlePayment } from './paymentResult';

const noSleep = () => Promise.resolve();

describe('settlePayment', () => {
  it('returns paid as soon as the gateway reference verifies as paid', async () => {
    const verify = jest.fn().mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ status: 'paid' });
    await expect(settlePayment(verify, 'ref-1', { tries: 5, delayMs: 1, sleep: noSleep })).resolves.toBe('paid');
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it('returns failed immediately on a terminal failure', async () => {
    const verify = jest.fn().mockResolvedValue({ status: 'failed' });
    await expect(settlePayment(verify, 'ref-1', { tries: 5, delayMs: 1, sleep: noSleep })).resolves.toBe('failed');
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('gives up with "pending" after the last try, so the UI can say it is still processing', async () => {
    const verify = jest.fn().mockResolvedValue({ status: 'pending' });
    await expect(settlePayment(verify, 'ref-1', { tries: 3, delayMs: 1, sleep: noSleep })).resolves.toBe('pending');
    expect(verify).toHaveBeenCalledTimes(3);
  });

  it('treats a verify error as still-pending rather than failed (the webhook may confirm later)', async () => {
    const verify = jest.fn().mockRejectedValue(new Error('network'));
    await expect(settlePayment(verify, 'ref-1', { tries: 2, delayMs: 1, sleep: noSleep })).resolves.toBe('pending');
  });
});

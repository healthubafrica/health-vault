import { parseCheckoutReturn, openCheckout, PAYMENT_RETURN_URL } from './checkout';

const mockAuth = jest.fn();
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: (...a: unknown[]) => mockAuth(...a) }));

describe('parseCheckoutReturn', () => {
  it('reads reference and status from the deep link', () => {
    expect(parseCheckoutReturn('myhealthvault://payments/verify?reference=abc%201&status=success')).toEqual({
      reference: 'abc 1',
      status: 'success',
    });
  });

  it('falls back to trxref and tx_ref', () => {
    expect(parseCheckoutReturn('myhealthvault://payments/verify?trxref=t1').reference).toBe('t1');
    expect(parseCheckoutReturn('myhealthvault://payments/verify?tx_ref=f1&status=completed').reference).toBe('f1');
  });

  it('returns nothing for a missing or empty url', () => {
    expect(parseCheckoutReturn(undefined)).toEqual({ reference: undefined, status: undefined });
    expect(parseCheckoutReturn('myhealthvault://payments/verify')).toEqual({ reference: undefined, status: undefined });
  });
});

describe('openCheckout', () => {
  beforeEach(() => mockAuth.mockReset());

  it('opens an auth session against the return deep link and parses the result', async () => {
    mockAuth.mockResolvedValue({ type: 'success', url: `${PAYMENT_RETURN_URL}?reference=r9&status=success` });
    await expect(openCheckout('https://pay.example/x')).resolves.toEqual({ reference: 'r9', status: 'success' });
    expect(mockAuth).toHaveBeenCalledWith('https://pay.example/x', PAYMENT_RETURN_URL);
  });

  it('returns an empty hint when the user dismisses the browser', async () => {
    mockAuth.mockResolvedValue({ type: 'cancel' });
    await expect(openCheckout('https://pay.example/x')).resolves.toEqual({});
  });
});

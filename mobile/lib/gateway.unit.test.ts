import { CARD_GATEWAYS, DEFAULT_GATEWAY, effectiveGateway, isPaystackActive } from './gateway';

describe('gateway defaults', () => {
  it('defaults to Paystack', () => {
    expect(DEFAULT_GATEWAY).toBe('Paystack');
  });

  it('lists Paystack first, then Flutterwave', () => {
    expect([...CARD_GATEWAYS]).toEqual(['Paystack', 'Flutterwave']);
  });
});

describe('isPaystackActive', () => {
  it('is true only when the API lists Paystack as active', () => {
    expect(isPaystackActive([{ gateway: 'paystack', active: true }])).toBe(true);
  });

  it('is false when Paystack is listed but inactive', () => {
    expect(isPaystackActive([{ gateway: 'paystack', active: false }])).toBe(false);
  });

  it('is false when statuses have not loaded, failed to load, or omit Paystack', () => {
    expect(isPaystackActive(undefined)).toBe(false);
    expect(isPaystackActive(null)).toBe(false);
    expect(isPaystackActive([{ gateway: 'flutterwave', active: true }])).toBe(false);
  });
});

describe('effectiveGateway', () => {
  it('honours a Paystack choice once Paystack is live', () => {
    expect(effectiveGateway('Paystack', true)).toBe('Paystack');
  });

  it('never sends Paystack when the API does not report it live', () => {
    expect(effectiveGateway('Paystack', false)).toBe('Flutterwave');
  });

  it('keeps Flutterwave regardless of Paystack availability', () => {
    expect(effectiveGateway('Flutterwave', true)).toBe('Flutterwave');
    expect(effectiveGateway('Flutterwave', false)).toBe('Flutterwave');
  });
});

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MakePaymentScreen from './make-payment';

jest.setTimeout(30000);

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));

const mockOpenBrowserAsync = jest.fn().mockResolvedValue({});
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: (...a: unknown[]) => mockOpenBrowserAsync(...a) }));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ApiError: actual.ApiError,
    generateIdempotencyKey: jest.fn(() => 'key-' + Math.random()),
    analytics: { track: jest.fn() },
    payments: {
      initiate: jest.fn(),
      verify: jest.fn(),
      validateCharge: jest.fn(),
      getGatewayStatus: jest.fn(),
    },
    paymentMethods: { list: jest.fn() },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { payments, paymentMethods } = require('@/lib/api');

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MakePaymentScreen />
    </QueryClientProvider>,
  );
}

describe('MakePaymentScreen', () => {
  beforeEach(() => {
    mockOpenBrowserAsync.mockClear();
    payments.initiate.mockReset();
    payments.verify.mockReset().mockResolvedValue({ status: 'paid' });
    payments.validateCharge.mockReset();
    payments.getGatewayStatus.mockReset().mockResolvedValue([
      { gateway: 'flutterwave', active: true },
      { gateway: 'paystack', active: false },
    ]);
    paymentMethods.list.mockReset().mockResolvedValue([]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => (Alert.alert as jest.Mock).mockRestore());

  function fill(r: ReturnType<typeof renderScreen>) {
    fireEvent.changeText(r.getByPlaceholderText('e.g. Consultation fee, lab test'), 'Lab test');
    fireEvent.changeText(r.getByPlaceholderText('0.00'), '1500');
  }

  it('rejects an empty form without calling the API', async () => {
    const r = renderScreen();
    fireEvent.press(await r.findByText('Continue to Checkout'));
    expect(Alert.alert).toHaveBeenCalledWith('Incomplete Form', expect.any(String));
    expect(payments.initiate).not.toHaveBeenCalled();
  });

  it('sends the amount in kobo with an idempotency key and verifies after checkout', async () => {
    payments.initiate.mockResolvedValue({ paymentId: 'p1', authorizationUrl: 'https://pay.example/x', reference: 'ref-1' });
    const r = renderScreen();
    fill(r);
    fireEvent.press(await r.findByText('Continue to Checkout'));

    await waitFor(() => expect(payments.initiate).toHaveBeenCalled());
    const [body, key] = payments.initiate.mock.calls[0];
    expect(body).toMatchObject({ gateway: 'Flutterwave', amountKobo: 150000, currency: 'NGN', client: 'mobile' });
    expect(typeof key).toBe('string');
    await waitFor(() => expect(payments.verify).toHaveBeenCalledWith('ref-1'));
  });

  it('uses a fresh idempotency key for a second attempt after a settled payment', async () => {
    payments.initiate.mockResolvedValue({ paymentId: 'p1', authorizationUrl: 'https://pay.example/x', reference: 'ref-1' });
    const r = renderScreen();
    fill(r);
    fireEvent.press(await r.findByText('Continue to Checkout'));
    await waitFor(() => expect(payments.verify).toHaveBeenCalled());
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Payment successful', expect.any(String)));

    fireEvent.press(await r.findByText('Continue to Checkout'));
    await waitFor(() => expect(payments.initiate).toHaveBeenCalledTimes(2));
    expect(payments.initiate.mock.calls[1][1]).not.toBe(payments.initiate.mock.calls[0][1]);
  });

  it('charges a saved card and asks for the bank OTP when required', async () => {
    paymentMethods.list.mockResolvedValue([
      { id: 'pm1', gateway: 'Flutterwave', cardBrand: 'VISA', last4: '4242', isDefault: true, createdAt: '' },
    ]);
    payments.initiate.mockResolvedValue({ paymentId: 'p1', requiresOtp: true, flwRef: 'flw-1', reference: 'ref-1' });
    payments.validateCharge.mockResolvedValue({ status: 'successful', paymentId: 'p1' });
    const r = renderScreen();
    await r.findByText('VISA ····4242');
    fill(r);
    fireEvent.press(await r.findByText('Continue to Checkout'));

    await waitFor(() => expect(payments.initiate).toHaveBeenCalled());
    expect(payments.initiate.mock.calls[0][0]).toMatchObject({ gateway: 'Flutterwave', paymentMethodId: 'pm1' });
    expect(payments.initiate.mock.calls[0][0].savePaymentMethod).toBeUndefined();

    fireEvent.changeText(await r.findByPlaceholderText('One-time code'), '123456');
    fireEvent.press(await r.findByText('Confirm payment'));
    await waitFor(() =>
      expect(payments.validateCharge).toHaveBeenCalledWith({ paymentId: 'p1', flwRef: 'flw-1', otp: '123456' }),
    );
  });

  it('never falls through to the bank-transfer screen when a card payment has no checkout link', async () => {
    payments.initiate.mockResolvedValue({ paymentId: 'p1' });
    const r = renderScreen();
    fill(r);
    fireEvent.press(await r.findByText('Continue to Checkout'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Could not start payment', expect.any(String)));
    expect(r.queryByText('Reference Generated')).toBeNull();
  });
});

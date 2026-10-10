import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubscriptionScreen from './subscription';
import { ApiError } from '@/lib/api';

jest.setTimeout(30000);

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

const mockOpenBrowserAsync = jest.fn().mockResolvedValue({});
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: (...args: unknown[]) => mockOpenBrowserAsync(...args) }));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ApiError: actual.ApiError,
    analytics: { track: jest.fn() },
    generateIdempotencyKey: jest.fn(() => 'key-1'),
    subscriptions: {
      getMy: jest.fn(),
      listPlans: jest.fn(),
      upgrade: jest.fn(),
      cancel: jest.fn(),
    },
    payments: { getGatewayStatus: jest.fn() },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { analytics, subscriptions, payments } = require('@/lib/api');

const gatewaysWithPaystack = (paystackActive: boolean) => [
  { gateway: 'flutterwave', name: 'Flutterwave', active: true },
  { gateway: 'paystack', name: 'Paystack', active: paystackActive },
  { gateway: 'bank_transfer', name: 'Bank Transfer', active: true },
];

const freePlan = { id: 'p0', slug: 'free', tier: 'free', name: 'Free', priceKobo: 0, billingPeriod: 'monthly', features: ['Basic access'] };
const proPlan = {
  id: 'p1', slug: 'pro', tier: 'pro', name: 'Pro', priceKobo: 500000, annualPriceKobo: 5000000,
  billingPeriod: 'monthly', features: ['Priority booking', 'Unlimited TeleCare'],
};
const activeSub = { id: 's1', status: 'active', startedAt: '2026-01-01', expiresAt: null, autoRenew: true, plan: freePlan };

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SubscriptionScreen />
    </QueryClientProvider>,
  );
}

describe('SubscriptionScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockOpenBrowserAsync.mockClear();
    analytics.track.mockClear();
    subscriptions.getMy.mockReset().mockResolvedValue({ data: activeSub });
    subscriptions.listPlans.mockReset().mockResolvedValue({ data: [freePlan, proPlan] });
    subscriptions.upgrade.mockReset();
    subscriptions.cancel.mockReset().mockResolvedValue({});
    payments.getGatewayStatus.mockReset().mockResolvedValue(gatewaysWithPaystack(false));
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore();
  });

  it('shows the current plan and available plans', async () => {
    const { findAllByText, findByText } = renderScreen();
    // "Free" appears twice: the current-plan card's name and the Free plan's price label.
    expect((await findAllByText('Free')).length).toBeGreaterThanOrEqual(2);
    expect(await findByText('Pro')).toBeTruthy();
    expect(await findByText('Priority booking')).toBeTruthy();
  });

  it('tracks and starts checkout when upgrading to a paid plan', async () => {
    subscriptions.upgrade.mockResolvedValue({
      requiresPayment: true, paymentId: 'pay1', gateway: 'Flutterwave',
      authorizationUrl: 'https://pay.example/checkout', amountKobo: 500000, currency: 'NGN',
    });

    const { findByText } = renderScreen();
    fireEvent.press(await findByText('Upgrade'));

    expect(analytics.track).toHaveBeenCalledWith('ui_click', { element_id: 'subscribe_cta_pro', feature_area: 'subscriptions' });
    expect(analytics.track).toHaveBeenCalledWith('plan_select', { plan: 'pro', billing: 'monthly', isSwitch: true });
    await waitFor(() => expect(subscriptions.upgrade).toHaveBeenCalledWith('p1', 'monthly', 'Flutterwave', expect.any(String)));
    await waitFor(() => expect(mockOpenBrowserAsync).toHaveBeenCalledWith('https://pay.example/checkout', 'myhealthvault://payments/verify'));
  });

  it('goes straight to Flutterwave with no popup while Paystack is not live', async () => {
    subscriptions.upgrade.mockResolvedValue({
      requiresPayment: true, paymentId: 'pay0', gateway: 'Flutterwave',
      authorizationUrl: 'https://pay.example/checkout', amountKobo: 500000, currency: 'NGN',
    });
    const { findByText, queryByText } = renderScreen();
    fireEvent.press(await findByText('Upgrade'));

    expect(queryByText('Choose how to pay')).toBeNull();
    await waitFor(() => expect(subscriptions.upgrade).toHaveBeenCalledWith('p1', 'monthly', 'Flutterwave', expect.any(String)));
  });

  it('asks which gateway to use once Paystack is live, with Paystack preselected', async () => {
    payments.getGatewayStatus.mockResolvedValue(gatewaysWithPaystack(true));
    subscriptions.upgrade.mockResolvedValue({
      requiresPayment: true, paymentId: 'pay2', gateway: 'Paystack',
      authorizationUrl: 'https://checkout.paystack.com/abc', amountKobo: 500000, currency: 'NGN',
    });

    const { findByText } = renderScreen();
    await waitFor(() => expect(payments.getGatewayStatus).toHaveBeenCalled());
    fireEvent.press(await findByText('Upgrade'));
    expect(await findByText('Choose how to pay')).toBeTruthy();
    fireEvent.press(await findByText('Continue with Paystack'));

    await waitFor(() => expect(subscriptions.upgrade).toHaveBeenCalledWith('p1', 'monthly', 'Paystack', expect.any(String)));
    await waitFor(() => expect(mockOpenBrowserAsync).toHaveBeenCalledWith('https://checkout.paystack.com/abc', 'myhealthvault://payments/verify'));
  });

  it('lets the patient switch to Flutterwave in the popup', async () => {
    payments.getGatewayStatus.mockResolvedValue(gatewaysWithPaystack(true));
    subscriptions.upgrade.mockResolvedValue({
      requiresPayment: true, paymentId: 'pay3', gateway: 'Flutterwave',
      authorizationUrl: 'https://pay.example/checkout', amountKobo: 500000, currency: 'NGN',
    });

    const { findByText } = renderScreen();
    await waitFor(() => expect(payments.getGatewayStatus).toHaveBeenCalled());
    fireEvent.press(await findByText('Upgrade'));
    fireEvent.press(await findByText('Flutterwave'));
    fireEvent.press(await findByText('Continue with Flutterwave'));

    await waitFor(() => expect(subscriptions.upgrade).toHaveBeenCalledWith('p1', 'monthly', 'Flutterwave', expect.any(String)));
  });

  it('shows an alert instead of crashing when checkout fails to start', async () => {
    subscriptions.upgrade.mockRejectedValue(new ApiError(500, 'Gateway unavailable'));

    const { findByText } = renderScreen();
    fireEvent.press(await findByText('Upgrade'));

    await waitFor(() => expect(analytics.track).toHaveBeenCalledWith('subscription_checkout_error', { plan: 'pro' }));
    expect(Alert.alert).toHaveBeenCalledWith('Could not start upgrade', 'Gateway unavailable');
  });

  it('switches to annual pricing when the Annually toggle is pressed', async () => {
    const { findByText, queryByText } = renderScreen();
    await findByText('Pro');

    expect(queryByText('₦5,000 / mo')).toBeTruthy();
    fireEvent.press(await findByText('Annually'));
    expect(await findByText('₦50,000 / yr')).toBeTruthy();
  });

  it('shows a retryable error state when the plans request fails', async () => {
    subscriptions.listPlans.mockReset().mockRejectedValue(new ApiError(500, 'boom'));

    const { findByText } = renderScreen();
    expect(await findByText('Failed to load data')).toBeTruthy();

    subscriptions.listPlans.mockResolvedValue({ data: [freePlan, proPlan] });
    fireEvent.press(await findByText('Try Again'));
    await findByText('Pro');
  });

  it('confirms and cancels the active paid subscription', async () => {
    subscriptions.getMy.mockResolvedValue({ data: { ...activeSub, plan: proPlan } });

    const { findByText } = renderScreen();
    fireEvent.press(await findByText('Cancel Subscription'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Cancel Subscription',
      'Cancel your Pro plan?',
      expect.arrayContaining([expect.objectContaining({ text: 'Cancel Plan' })]),
    );

    const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
    const destructive = buttons.find((b: { text: string }) => b.text === 'Cancel Plan');
    destructive.onPress();

    await waitFor(() => expect(subscriptions.cancel).toHaveBeenCalledWith('s1'));
    expect(analytics.track).toHaveBeenCalledWith('subscription_cancelled', { plan: 'pro' });
  });
});

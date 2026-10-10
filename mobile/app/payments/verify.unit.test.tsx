import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PaymentVerifyScreen from './verify';

jest.setTimeout(30000);

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/api', () => ({
  payments: { verify: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { payments } = require('@/lib/api');

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PaymentVerifyScreen />
    </QueryClientProvider>,
  );
}

describe('PaymentVerifyScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    payments.verify.mockReset();
  });

  it('confirms the reference from the deep link and shows the outcome', async () => {
    mockParams = { reference: 'ref-7', status: 'success' };
    payments.verify.mockResolvedValue({ status: 'paid' });
    const r = renderScreen();
    expect(await r.findByText('Payment successful')).toBeTruthy();
    expect(payments.verify).toHaveBeenCalledWith('ref-7');
    fireEvent.press(r.getByText('View invoices'));
    expect(mockReplace).toHaveBeenCalledWith('/invoices');
  });

  it('reads the Flutterwave tx_ref and reports a failed payment', async () => {
    mockParams = { tx_ref: 'flw-1', status: 'cancelled' };
    payments.verify.mockResolvedValue({ status: 'failed' });
    const r = renderScreen();
    expect(await r.findByText('Payment not completed')).toBeTruthy();
    await waitFor(() => expect(payments.verify).toHaveBeenCalledWith('flw-1'));
  });

  it('does not call the API when the link has no reference', async () => {
    mockParams = {};
    const r = renderScreen();
    expect(await r.findByText('Nothing to confirm')).toBeTruthy();
    expect(payments.verify).not.toHaveBeenCalled();
  });
});

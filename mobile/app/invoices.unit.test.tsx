import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InvoicesScreen from './invoices';

jest.setTimeout(30000);

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

const mockShareHtml = jest.fn();
jest.mock('@/lib/shareFile', () => ({ shareHtmlAsPdf: (...a: unknown[]) => mockShareHtml(...a) }));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ApiError: actual.ApiError,
    payments: { list: jest.fn(), getReceiptHtml: jest.fn() },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { payments, ApiError } = require('@/lib/api');

const base = { hhaRef: 'HHA-1', amountKobo: 500000, currency: 'NGN', gateway: 'Paystack', description: 'Consult', createdAt: '2026-10-01T00:00:00Z' };

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InvoicesScreen />
    </QueryClientProvider>,
  );
}

describe('InvoicesScreen receipts', () => {
  beforeEach(() => {
    mockShareHtml.mockReset().mockResolvedValue(undefined);
    payments.getReceiptHtml.mockReset().mockResolvedValue('<html>receipt</html>');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => (Alert.alert as jest.Mock).mockRestore());

  it('fetches the receipt html and shares it as a pdf for a paid payment', async () => {
    payments.list.mockResolvedValue({ data: [{ ...base, id: 'pay-1', status: 'paid' }] });
    const r = renderScreen();
    fireEvent.press(await r.findByText('View / Share receipt'));
    await waitFor(() => expect(payments.getReceiptHtml).toHaveBeenCalledWith('pay-1'));
    await waitFor(() => expect(mockShareHtml).toHaveBeenCalledWith('<html>receipt</html>', 'Receipt HHA-1'));
  });

  it('offers a receipt for refunded payments and none for pending ones', async () => {
    payments.list.mockResolvedValue({
      data: [
        { ...base, id: 'pay-2', status: 'refunded' },
        { ...base, id: 'pay-3', status: 'pending' },
      ],
    });
    const r = renderScreen();
    expect(await r.findAllByText('View / Share receipt')).toHaveLength(1);
    expect(r.getByText('No receipt yet')).toBeTruthy();
  });

  it('shows a friendly message when the receipt is not found', async () => {
    payments.list.mockResolvedValue({ data: [{ ...base, id: 'pay-1', status: 'paid' }] });
    payments.getReceiptHtml.mockRejectedValue(new ApiError(404, 'Not Found'));
    const r = renderScreen();
    fireEvent.press(await r.findByText('View / Share receipt'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Receipt unavailable', 'A receipt is not available for this payment yet.'),
    );
    expect(mockShareHtml).not.toHaveBeenCalled();
  });
});

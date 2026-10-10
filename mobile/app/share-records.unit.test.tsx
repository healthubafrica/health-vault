import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShareRecordsScreen from './share-records';

jest.setTimeout(30000);

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ApiError: actual.ApiError,
    shares: { list: jest.fn(), create: jest.fn(), revoke: jest.fn(), audit: jest.fn() },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { shares } = require('@/lib/api');

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ShareRecordsScreen />
    </QueryClientProvider>,
  );
}

describe('ShareRecordsScreen', () => {
  beforeEach(() => {
    shares.list.mockReset().mockResolvedValue([
      {
        id: 'sh1',
        label: 'For Dr Bello',
        accessMode: 'email_list',
        allowedEmails: ['dr@x.com'],
        recordTypes: ['lab'],
        expiresAt: null,
        isRevoked: false,
        detectForwarding: true,
        createdAt: '2026-10-01T00:00:00Z',
        _count: { accesses: 2 },
      },
    ]);
    shares.create.mockReset().mockResolvedValue({ id: 'new', token: 't', share: {}, notified: { emails: 1, phones: 0 } });
    shares.audit.mockReset().mockResolvedValue({
      share: {},
      accesses: [{ id: 'a1', action: 'otp_verified', visitorEmail: 'dr@x.com', occurredAt: '2026-10-02T10:00:00Z' }],
    });
  });

  it('sends the chosen expiry and label when creating a share', async () => {
    const r = renderScreen();
    await r.findByText('For Dr Bello');
    fireEvent.changeText(r.getByPlaceholderText("Enter recipient's email address"), 'a@b.com');
    fireEvent.press(r.getByText('Add'));
    fireEvent.press(r.getByText('30 days'));
    fireEvent.changeText(r.getByPlaceholderText('e.g. For my specialist referral'), 'Referral');
    fireEvent.press(r.getByText('Send Secure Share'));

    await waitFor(() => expect(shares.create).toHaveBeenCalled());
    const body = shares.create.mock.calls[0][0];
    expect(body.label).toBe('Referral');
    expect(body.allowedEmails).toEqual(['a@b.com']);
    const days = (new Date(body.expiresAt).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('omits expiresAt for "Never"', async () => {
    const r = renderScreen();
    await r.findByText('For Dr Bello');
    fireEvent.changeText(r.getByPlaceholderText("Enter recipient's email address"), 'a@b.com');
    fireEvent.press(r.getByText('Add'));
    fireEvent.press(r.getByText('Never'));
    fireEvent.press(r.getByText('Send Secure Share'));
    await waitFor(() => expect(shares.create).toHaveBeenCalled());
    expect(shares.create.mock.calls[0][0].expiresAt).toBeUndefined();
  });

  it('shows expiry, labels and opens the activity list', async () => {
    const r = renderScreen();
    expect(await r.findByText(/Never expires · 2 views/)).toBeTruthy();
    expect(r.getAllByText('Labs')).toHaveLength(2);
    fireEvent.press(r.getByLabelText('Activity'));
    expect(await r.findByText('Email verified')).toBeTruthy();
    expect(shares.audit).toHaveBeenCalledWith('sh1');
  });
});

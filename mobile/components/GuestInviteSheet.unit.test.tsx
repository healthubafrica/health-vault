import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GuestInviteSheet from './GuestInviteSheet';

jest.setTimeout(30000);

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ApiError: actual.ApiError,
    telecareGuestInvites: { list: jest.fn(), create: jest.fn(), revoke: jest.fn() },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { telecareGuestInvites, ApiError } = require('@/lib/api');

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <GuestInviteSheet sessionId="s1" visible onClose={jest.fn()} />
    </QueryClientProvider>,
  );
}

describe('GuestInviteSheet', () => {
  beforeEach(() => {
    telecareGuestInvites.list.mockReset().mockResolvedValue([
      { id: 'i1', guestName: 'Ngozi', guestEmail: 'n@x.com', isRevoked: false, createdAt: '2026-10-01T00:00:00Z' },
      { id: 'i2', guestName: 'Old Guest', guestEmail: 'o@x.com', isRevoked: true, createdAt: '2026-10-01T00:00:00Z' },
    ]);
    telecareGuestInvites.create.mockReset().mockResolvedValue({ id: 'i3' });
    telecareGuestInvites.revoke.mockReset().mockResolvedValue({});
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => (Alert.alert as jest.Mock).mockRestore());

  it('lists only active invites', async () => {
    const r = renderSheet();
    expect(await r.findByText('Ngozi')).toBeTruthy();
    expect(r.queryByText('Old Guest')).toBeNull();
  });

  it('validates the email before sending', async () => {
    const r = renderSheet();
    await r.findByText('Ngozi');
    fireEvent.changeText(r.getByPlaceholderText('Guest name'), 'Ada');
    fireEvent.changeText(r.getByPlaceholderText('Guest email'), 'nope');
    fireEvent.press(r.getByText('Send invite'));
    expect(telecareGuestInvites.create).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Invalid email', expect.any(String));
  });

  it('sends an invite with trimmed name and email', async () => {
    const r = renderSheet();
    await r.findByText('Ngozi');
    fireEvent.changeText(r.getByPlaceholderText('Guest name'), ' Ada ');
    fireEvent.changeText(r.getByPlaceholderText('Guest email'), 'ada@x.com');
    fireEvent.press(r.getByText('Send invite'));
    await waitFor(() =>
      expect(telecareGuestInvites.create).toHaveBeenCalledWith('s1', { guestName: 'Ada', guestEmail: 'ada@x.com' }),
    );
  });

  it('revokes an invite', async () => {
    const r = renderSheet();
    fireEvent.press(await r.findByText('Revoke'));
    await waitFor(() => expect(telecareGuestInvites.revoke).toHaveBeenCalledWith('s1', 'i1'));
  });

  it('shows a friendly message on 404', async () => {
    telecareGuestInvites.list.mockRejectedValue(new ApiError(404, 'Not Found'));
    const r = renderSheet();
    expect(await r.findByText('Guest invites are not available for this session.')).toBeTruthy();
  });
});

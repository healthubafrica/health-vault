import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupportTicketScreen from './support-ticket';
import { useAuthStore } from '@/lib/stores/authStore';

jest.setTimeout(30000);

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: 't1' }),
}));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ApiError: actual.ApiError, support: { get: jest.fn(), addMessage: jest.fn() } };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { support, ApiError } = require('@/lib/api');

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SupportTicketScreen />
    </QueryClientProvider>,
  );
}

describe('SupportTicketScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B' } as never });
    support.get.mockReset().mockResolvedValue({
      id: 't1',
      hhaRef: 'SUP-000001',
      subject: 'Lab report missing',
      status: 'in_progress',
      messages: [
        { id: 'm1', body: 'Where is my report?', senderId: 'u1', createdAt: '2026-10-01T10:00:00Z' },
        { id: 'm2', body: 'We are on it.', senderId: 'staff', createdAt: '2026-10-01T11:00:00Z' },
        { id: 'm3', body: 'internal note', senderId: 'staff', isInternal: true, createdAt: '2026-10-01T11:30:00Z' },
      ],
    });
    support.addMessage.mockReset().mockResolvedValue({ id: 'm4' });
  });

  it('renders the thread without internal notes', async () => {
    const r = renderScreen();
    expect(await r.findByText('Where is my report?')).toBeTruthy();
    expect(r.getByText('We are on it.')).toBeTruthy();
    expect(r.queryByText('internal note')).toBeNull();
    expect(r.getByText('In progress')).toBeTruthy();
  });

  it('sends a reply', async () => {
    const r = renderScreen();
    await r.findByText('Where is my report?');
    fireEvent.changeText(r.getByPlaceholderText('Write a reply…'), '  Thanks  ');
    fireEvent.press(r.getByLabelText('Send reply'));
    await waitFor(() => expect(support.addMessage).toHaveBeenCalledWith('t1', 'Thanks'));
  });

  it('shows a friendly state when the ticket is gone', async () => {
    support.get.mockRejectedValue(new ApiError(404, 'Not Found'));
    const r = renderScreen();
    expect(await r.findByText('Ticket not found')).toBeTruthy();
  });
});

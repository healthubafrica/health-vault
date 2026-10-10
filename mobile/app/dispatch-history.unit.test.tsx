import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DispatchHistoryScreen from './dispatch-history';
import DispatchCaseScreen from './dispatch-case';

jest.setTimeout(30000);

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
  useLocalSearchParams: () => ({ id: 'c1' }),
}));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ApiError: actual.ApiError, dispatch: { list: jest.fn(), get: jest.fn() } };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dispatch, ApiError } = require('@/lib/api');

function wrap(el: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{el}</QueryClientProvider>);
}

describe('dispatch history', () => {
  beforeEach(() => {
    mockPush.mockClear();
    dispatch.list.mockReset();
    dispatch.get.mockReset();
  });

  it('lists cases and opens the detail', async () => {
    dispatch.list.mockResolvedValue({
      data: [{ id: 'c1', hhaRef: 'DSP-1', emergencyType: 'Chest_Pain', status: 'en_route', createdAt: '2026-10-01T10:00:00Z' }],
    });
    const r = wrap(<DispatchHistoryScreen />);
    expect(await r.findByText('Chest pain')).toBeTruthy();
    expect(r.getByText('Unit on the way')).toBeTruthy();
    fireEvent.press(r.getByText('Chest pain'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/dispatch-case', params: { id: 'c1' } });
  });

  it('shows an empty state with no cases', async () => {
    dispatch.list.mockResolvedValue({ data: [] });
    const r = wrap(<DispatchHistoryScreen />);
    expect(await r.findByText('No dispatch requests')).toBeTruthy();
  });

  it('renders the status timeline in order', async () => {
    dispatch.get.mockResolvedValue({
      data: {
        id: 'c1',
        hhaRef: 'DSP-1',
        emergencyType: 'Other',
        status: 'unit_assigned',
        createdAt: '2026-10-01T10:00:00Z',
        events: [
          { id: 'e2', status: 'unit_assigned', occurredAt: '2026-10-01T10:05:00Z', notes: 'Unit 4 dispatched' },
          { id: 'e1', status: 'requested', occurredAt: '2026-10-01T10:00:00Z' },
        ],
      },
    });
    const r = wrap(<DispatchCaseScreen />);
    expect(await r.findByText('Unit 4 dispatched')).toBeTruthy();
    expect(r.getByText('Request received')).toBeTruthy();
  });

  it('shows a friendly state when the case is not found', async () => {
    dispatch.get.mockRejectedValue(new ApiError(404, 'Not Found'));
    const r = wrap(<DispatchCaseScreen />);
    expect(await r.findByText('Request not found')).toBeTruthy();
  });
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeDashboardScreen from './index';
import { useAuthStore } from '@/lib/stores/authStore';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/lib/api', () => ({
  vitals: { list: jest.fn() },
  appointments: { list: jest.fn() },
  payments: { list: jest.fn() },
  analytics: { track: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { vitals, appointments, payments, analytics } = require('@/lib/api');

const testUser = { id: 'u1', email: 'a@b.com', firstName: 'Ada', lastName: 'Okafor' };

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <HomeDashboardScreen />
    </QueryClientProvider>,
  );
}

describe('HomeDashboardScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    analytics.track.mockClear();
    useAuthStore.setState({ user: testUser, isAuthenticated: true, isLoading: false });
    vitals.list.mockResolvedValue({ data: [] });
    appointments.list.mockResolvedValue({ data: [], meta: { total: 0 } });
    payments.list.mockResolvedValue({ data: [] });
  });

  it('greets the signed-in user by name', async () => {
    const { findByText } = renderHome();
    expect(await findByText('Ada Okafor')).toBeTruthy();
  });

  it('shows an empty state and books a first appointment when there are none upcoming', async () => {
    const { findByText } = renderHome();

    const bookNow = await findByText('Book now →');
    fireEvent.press(bookNow);

    expect(analytics.track).toHaveBeenCalledWith('ui_click', {
      element_id: 'book_appointment_cta',
      feature_area: 'appointments',
    });
    expect(mockPush).toHaveBeenCalledWith('/book-appointment-step1');
  });

  it('renders the upcoming TeleCare appointment and tracks joining the call', async () => {
    appointments.list.mockResolvedValue({
      data: [
        {
          id: 'a1',
          scheduledAt: '2026-09-25T10:00:00Z',
          isTelecare: true,
          status: 'confirmed',
          serviceType: 'MinuteCare',
          provider: { title: 'Dr.', firstName: 'John', lastName: 'Doe', specialty: 'General' },
        },
      ],
      meta: { total: 1 },
    });

    const { findByText } = renderHome();
    const joinButton = await findByText('Join Call');
    fireEvent.press(joinButton);

    expect(analytics.track).toHaveBeenCalledWith('ui_click', {
      element_id: 'join_telecare_cta',
      feature_area: 'telecare',
    });
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/telecare');
  });

  it('tracks and navigates for each quick action', async () => {
    const { findByText } = renderHome();

    fireEvent.press(await findByText('Check Vitals'));
    expect(analytics.track).toHaveBeenCalledWith('ui_click', { element_id: 'quick_action_vitals', feature_area: 'dashboard' });
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/vitals');

    fireEvent.press(await findByText('Talk to Doctor'));
    expect(analytics.track).toHaveBeenCalledWith('ui_click', { element_id: 'quick_action_telecare', feature_area: 'dashboard' });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/book-appointment-step1', params: { preselect: 'telecare' } });

    fireEvent.press(await findByText('Book Care'));
    expect(analytics.track).toHaveBeenCalledWith('ui_click', { element_id: 'quick_action_bookcare', feature_area: 'dashboard' });
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/services');
  });

  it('shows "No recent activity" when there are no payments or vitals', async () => {
    const { findByText } = renderHome();
    expect(await findByText('No recent activity')).toBeTruthy();
  });

  it('renders a recent payment as an activity card', async () => {
    payments.list.mockResolvedValue({
      data: [{ id: 'p1', description: 'TeleCare consult', amountKobo: 500000, status: 'paid', createdAt: '2026-09-20T00:00:00Z' }],
    });

    const { findByText, queryByText } = renderHome();
    expect(await findByText('TeleCare consult')).toBeTruthy();
    await waitFor(() => expect(queryByText('No recent activity')).toBeNull());
  });
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyCareTeamScreen from './my-care-team';

jest.setTimeout(30000);

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('@/components/EmergencyFAB', () => () => null);
jest.mock('@/lib/api', () => ({ patients: { getMyCareTeam: jest.fn() } }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { patients } = require('@/lib/api');

describe('MyCareTeamScreen', () => {
  it('has no add-provider stub and explains the team is built from visits', async () => {
    patients.getMyCareTeam.mockResolvedValue({
      data: [
        { id: 'p1', firstName: 'Ada', lastName: 'Bello', title: 'Dr.', specialty: 'GP', visitCount: 2, lastVisitAt: '2026-10-01T00:00:00Z', isAvailable: true },
      ],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = render(
      <QueryClientProvider client={client}>
        <MyCareTeamScreen />
      </QueryClientProvider>,
    );
    expect(await r.findByText('Dr. Ada Bello')).toBeTruthy();
    expect(r.queryByText('Add Provider')).toBeNull();
    expect(r.getByText(/built automatically from the providers you have seen/)).toBeTruthy();
  });
});

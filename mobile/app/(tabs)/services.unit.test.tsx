import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ServicesTabScreen from './services';
import { useAuthStore } from '@/lib/stores/authStore';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/lib/api', () => ({
  analytics: { track: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { analytics } = require('@/lib/api');

const testUser = { id: 'u1', email: 'a@b.com', firstName: 'Ada', lastName: 'Okafor' };

describe('ServicesTabScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    analytics.track.mockClear();
    useAuthStore.setState({ user: testUser, isAuthenticated: true, isLoading: false });
  });

  it('greets the signed-in user', () => {
    const { getByText } = render(<ServicesTabScreen />);
    expect(getByText('Hello, Ada Okafor!')).toBeTruthy();
  });

  it('renders every curated hub service', () => {
    const { getByText } = render(<ServicesTabScreen />);
    expect(getByText('Telemedicine Services - Anywhere, Anytime')).toBeTruthy();
    expect(getByText('Quick Care, Anytime, Anywhere')).toBeTruthy();
    expect(getByText('Fast, Accurate, and Comprehensive Testing')).toBeTruthy();
    expect(getByText('Personalized Medicine & Healthcare')).toBeTruthy();
    expect(getByText('Rapid Response, Lifesaving Care!')).toBeTruthy();
    expect(getByText('Smart Health & Safety Solutions')).toBeTruthy();
  });

  it('tracks and preselects TeleCare when its card is pressed', () => {
    const { getByText } = render(<ServicesTabScreen />);
    fireEvent.press(getByText('Telemedicine Services - Anywhere, Anytime'));

    expect(analytics.track).toHaveBeenCalledWith('ui_click', { element_id: 'service_telecare_cta', feature_area: 'services' });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/book-appointment-step1', params: { preselect: 'telecare' } });
  });

  it('routes DispatchCare straight to /emergency instead of the booking flow', () => {
    const { getByText } = render(<ServicesTabScreen />);
    fireEvent.press(getByText('Rapid Response, Lifesaving Care!'));

    expect(analytics.track).toHaveBeenCalledWith('ui_click', { element_id: 'service_dispatch-care_cta', feature_area: 'services' });
    expect(mockPush).toHaveBeenCalledWith('/emergency');
  });

  it('routes MyHealth Vault+ to the records tab', () => {
    const { getByText } = render(<ServicesTabScreen />);
    fireEvent.press(getByText('Smart Health & Safety Solutions'));

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/records');
  });

  it('fires a cta_impression for every rendered service card on mount', () => {
    render(<ServicesTabScreen />);
    const impressionCalls = analytics.track.mock.calls.filter(([event]: [string]) => event === 'cta_impression');
    expect(impressionCalls).toHaveLength(6);
  });
});

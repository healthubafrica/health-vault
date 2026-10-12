import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyAvatar } from './useMyAvatar';
import { useAuthStore } from './stores/authStore';

jest.mock('./api', () => ({
  patients: { getMyProfile: jest.fn() },
  setAccessToken: jest.fn(),
  saveRefreshToken: jest.fn(),
  getStoredRefreshToken: jest.fn(),
  clearStoredTokens: jest.fn(),
  apiRequest: jest.fn(),
  refreshSession: jest.fn(),
  setSessionExpiredHandler: jest.fn(),
}));
jest.mock('./notifications', () => ({ unregisterPushToken: jest.fn() }));
jest.mock('expo-local-authentication', () => ({}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { patients } = require('./api');

const profile = (over: Record<string, unknown> = {}) => ({
  data: { firstName: 'Ada', lastName: 'Obi', gender: 'Female', profilePhotoUrl: 'https://x/fresh.jpg', ...over },
});

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useMyAvatar(), { wrapper });
}

describe('useMyAvatar', () => {
  beforeEach(() => {
    patients.getMyProfile.mockReset().mockResolvedValue(profile());
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: '1', email: 'a@b.c', firstName: 'Ada', lastName: 'Obi', avatarUrl: 'https://x/stale.jpg' },
    });
  });

  it('starts from the login snapshot, then prefers the fresh profile and syncs the store', async () => {
    const { result } = setup();
    expect(result.current.uri).toBe('https://x/stale.jpg');
    await waitFor(() => expect(result.current.uri).toBe('https://x/fresh.jpg'));
    expect(result.current.gender).toBe('Female');
    expect(result.current.name).toBe('Ada Obi');
    await waitFor(() => expect(useAuthStore.getState().user?.avatarUrl).toBe('https://x/fresh.jpg'));
    expect(useAuthStore.getState().user?.gender).toBe('Female');
  });

  it('refetches the profile when the image errors, but not repeatedly', async () => {
    const { result } = setup();
    await waitFor(() => expect(patients.getMyProfile).toHaveBeenCalledTimes(1));
    await act(async () => {
      result.current.onImageError();
      result.current.onImageError();
    });
    await waitFor(() => expect(patients.getMyProfile).toHaveBeenCalledTimes(2));
  });
});

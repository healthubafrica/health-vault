import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  setAccessToken,
  saveRefreshToken,
  getStoredRefreshToken,
  clearStoredTokens,
  apiRequest,
  refreshSession,
  setSessionExpiredHandler,
  patients,
} from '../api';
import { unregisterPushToken } from '../notifications';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBiometricSupported: boolean;
  isBiometricEnrolled: boolean;
  login: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  checkBiometrics: () => Promise<boolean>;
  authenticateWithBiometrics: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isBiometricSupported: false,
  isBiometricEnrolled: false,

  checkBiometrics: async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      set({ isBiometricSupported: compatible, isBiometricEnrolled: enrolled });
      return compatible && enrolled;
    } catch {
      set({ isBiometricSupported: false, isBiometricEnrolled: false });
      return false;
    }
  },

  authenticateWithBiometrics: async () => {
    try {
      const isAvailable = await get().checkBiometrics();
      if (!isAvailable) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock MyHealth Vault+',
        fallbackLabel: 'Enter Password',
      });

      return result.success;
    } catch {
      return false;
    }
  },

  login: async (accessToken: string, refreshToken: string, user: UserProfile) => {
    setAccessToken(accessToken);
    await saveRefreshToken(refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      // Order matters: unregister the device while the access token is still valid, and
      // never refresh mid-logout (retryOnAuth=false) so an expired token can't bounce the
      // user through the session-expired flow.
      await unregisterPushToken();
      await apiRequest('/auth/logout', { method: 'POST' }, false).catch(() => {});
    } finally {
      await clearStoredTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return false;
      }

      // Check for biometrics gate if enrolled
      const isBiometricAvailable = await get().checkBiometrics();
      if (isBiometricAvailable) {
        const authed = await get().authenticateWithBiometrics();
        if (!authed) {
          set({ isLoading: false });
          return false;
        }
      }

      // Exchange the refresh token for a fresh access token (sent as the
      // x-refresh-token header — see refreshSession), then load the profile:
      // the refresh response carries tokens only, no user.
      const outcome = await refreshSession();
      if (outcome === 'rejected') {
        await clearStoredTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
        return false;
      }
      if (outcome === 'unreachable') {
        // Offline at launch: keep the stored session, let screens retry.
        set({ isLoading: false });
        return false;
      }

      const { data: profile } = await patients.getMyProfile();
      set({
        user: {
          id: profile.id,
          email: profile.user.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.user.phone ?? undefined,
          avatarUrl: profile.profilePhotoUrl ?? undefined,
        },
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch {
      // Profile fetch failed after a good refresh (e.g. network drop): do not
      // destroy a valid session over a transient error.
      set({ isLoading: false });
      return false;
    }
  },
}));

// A rejected refresh anywhere in the app (apiRequest) resets auth state so the
// root layout routes back to sign-in instead of leaving a dead session on screen.
// Called once from the root layout (not at import time, so tests that mock the
// API module can import this store).
export function registerSessionExpiryHandler() {
  setSessionExpiredHandler(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  });
}

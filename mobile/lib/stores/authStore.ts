import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  setAccessToken,
  saveRefreshToken,
  getStoredRefreshToken,
  clearStoredTokens,
  apiRequest,
} from '../api';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
  profilePhotoUrl?: string | null;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBiometricSupported: boolean;
  isBiometricEnrolled: boolean;
  login: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  updateUser: (partial: Partial<UserProfile>) => void;
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

  updateUser: (partial: Partial<UserProfile>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    }));
  },

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
      await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
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

      // Exchange refresh token for fresh session
      const data = await apiRequest<{ accessToken: string; refreshToken: string; user: UserProfile }>(
        '/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        },
        false
      );

      if (data.accessToken) {
        setAccessToken(data.accessToken);
        if (data.refreshToken) {
          await saveRefreshToken(data.refreshToken);
        }
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        return true;
      }

      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    } catch (err) {
      await clearStoredTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },
}));

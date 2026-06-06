'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { auth, saveTokens, clearTokens, type User } from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, phone?: string) => Promise<void>
  verifyOtp: (email: string, otp: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          // SEC-002: tokens are written as secure cookies by saveTokens()
          const res = await auth.login(email, password)
          saveTokens(res.accessToken, res.refreshToken)
          // Fetch full user profile after login
          const meRes = await auth.me()
          set({ user: meRes.data, isAuthenticated: true, isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : 'Login failed', isLoading: false })
          throw e
        }
      },

      register: async (email, password, phone) => {
        set({ isLoading: true, error: null })
        try {
          await auth.register(email, password, phone)
          set({ isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : 'Registration failed', isLoading: false })
          throw e
        }
      },

      verifyOtp: async (email, otp) => {
        set({ isLoading: true, error: null })
        try {
          // verify-otp returns tokens (auto-login on verification)
          const res = await auth.verifyOtp(email, otp)
          saveTokens(res.accessToken, res.refreshToken)
          const meRes = await auth.me()
          set({ user: meRes.data, isAuthenticated: true, isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : 'Verification failed', isLoading: false })
          throw e
        }
      },

      fetchMe: async () => {
        try {
          const meRes = await auth.me()
          set({ user: meRes.data, isAuthenticated: true })
        } catch {
          clearTokens()
          set({ user: null, isAuthenticated: false })
        }
      },

      logout: async () => {
        try {
          await auth.logout()
        } catch {
          // clear locally regardless of network error
        }
        clearTokens()
        set({ user: null, isAuthenticated: false })
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null })
        try {
          await auth.forgotPassword(email)
          set({ isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : 'Forgot password request failed', isLoading: false })
          throw e
        }
      },

      resetPassword: async (email, otp, newPassword) => {
        set({ isLoading: true, error: null })
        try {
          await auth.resetPassword(email, otp, newPassword)
          set({ isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : 'Password reset failed', isLoading: false })
          throw e
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'hha-auth',
      // SEC-002: only persist non-sensitive state. Tokens live in cookies, not here.
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
)

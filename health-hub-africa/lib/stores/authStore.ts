'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { auth, clearTokens, type User } from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, phoneNumber?: string, fullName?: string) => Promise<void>
  verifyOtp: (email: string, otp: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>
  requestSmsOtp: (email: string, phone?: string) => Promise<void>
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
          // The /api/auth/login BFF sets the session cookies (HttpOnly refresh).
          await auth.login(email, password)
          // Fetch full user profile after login
          const meRes = await auth.me()
          set({ user: meRes.data, isAuthenticated: true, isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : "We couldn't sign you in. Please try again.", isLoading: false })
          throw e
        }
      },

      register: async (email, password, phoneNumber, fullName) => {
        set({ isLoading: true, error: null })
        try {
          await auth.register(email, password, phoneNumber, fullName)
          set({ isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : "We couldn't create your account. Please try again.", isLoading: false })
          throw e
        }
      },

      verifyOtp: async (email, otp) => {
        set({ isLoading: true, error: null })
        try {
          // verify-otp auto-logs in; the BFF sets the session cookies.
          await auth.verifyOtp(email, otp)
          const meRes = await auth.me()
          set({ user: meRes.data, isAuthenticated: true, isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : "We couldn't verify your code. Please try again.", isLoading: false })
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
          set({ error: e instanceof Error ? e.message : "We couldn't send your reset code. Please try again.", isLoading: false })
          throw e
        }
      },

      resetPassword: async (email, otp, newPassword) => {
        set({ isLoading: true, error: null })
        try {
          await auth.resetPassword(email, otp, newPassword)
          set({ isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : "We couldn't reset your password. Please try again.", isLoading: false })
          throw e
        }
      },

      requestSmsOtp: async (email, phone) => {
        set({ isLoading: true, error: null })
        try {
          await auth.requestSmsOtp(email, phone)
          set({ isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : "We couldn't send your code. Please try again.", isLoading: false })
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

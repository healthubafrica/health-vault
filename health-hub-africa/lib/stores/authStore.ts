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
          const res = await auth.login(email, password)
          saveTokens(res.data.accessToken, res.data.refreshToken)
          set({ user: res.data.user, isAuthenticated: true, isLoading: false })
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
          const res = await auth.verifyOtp(email, otp)
          saveTokens(res.data.accessToken, res.data.refreshToken)
          set({ user: res.data.user, isAuthenticated: true, isLoading: false })
        } catch (e: unknown) {
          set({ error: e instanceof Error ? e.message : 'Verification failed', isLoading: false })
          throw e
        }
      },

      logout: async () => {
        try {
          await auth.logout()
        } catch {
          // ignore — clear locally regardless
        }
        clearTokens()
        set({ user: null, isAuthenticated: false })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'hha-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
)

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { auth, clearTokens, type User } from '@/lib/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  pendingUserId: string | null

  login: (email: string, password: string) => Promise<{ requiresTwoFactor: boolean }>
  verify2fa: (otp: string) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  clearPending: () => void
}

const ADMIN_ROLES = ['super_admin', 'admin', 'coordinator', 'provider']

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      pendingUserId: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await auth.login(email, password)

          if ('requiresTwoFactor' in res && res.requiresTwoFactor) {
            set({ isLoading: false, pendingUserId: res.userId })
            return { requiresTwoFactor: true }
          }

          const meRes = await auth.me()
          const user = meRes.data
          if (!ADMIN_ROLES.includes(user.role)) {
            clearTokens()
            set({ isLoading: false, error: "You don't have permission to access the admin panel." })
            return { requiresTwoFactor: false }
          }
          set({ user, isAuthenticated: true, isLoading: false })
          return { requiresTwoFactor: false }
        } catch (e: unknown) {
          set({
            error: e instanceof Error ? e.message : "We couldn't sign you in. Please try again.",
            isLoading: false,
          })
          throw e
        }
      },

      verify2fa: async (otp) => {
        const { pendingUserId } = get()
        if (!pendingUserId) throw new Error('No pending 2FA session')
        set({ isLoading: true, error: null })
        try {
          await auth.verify2fa(pendingUserId, otp)
          const meRes = await auth.me()
          const user = meRes.data
          if (!ADMIN_ROLES.includes(user.role)) {
            clearTokens()
            set({ isLoading: false, error: "You don't have permission to access the admin panel.", pendingUserId: null })
            return
          }
          set({ user, isAuthenticated: true, isLoading: false, pendingUserId: null })
        } catch (e: unknown) {
          set({
            error: e instanceof Error ? e.message : 'Invalid or expired code. Try again.',
            isLoading: false,
          })
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
          clearTokens()
        }
        set({ user: null, isAuthenticated: false, pendingUserId: null })
      },

      clearError: () => set({ error: null }),
      clearPending: () => set({ pendingUserId: null, error: null }),
    }),
    {
      name: 'hha-admin-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
)

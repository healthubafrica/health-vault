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
          const res = await auth.login(email, password)
          saveTokens(res.accessToken, res.refreshToken)
          const meRes = await auth.me()
          const user = meRes.data
          const adminRoles = ['super_admin', 'admin', 'coordinator']
          if (!adminRoles.includes(user.role)) {
            clearTokens()
            set({ isLoading: false, error: "You don't have permission to access the admin panel." })
            return
          }
          set({ user, isAuthenticated: true, isLoading: false })
        } catch (e: unknown) {
          set({
            error: e instanceof Error ? e.message : "We couldn't sign you in. Please try again.",
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
          // clear locally regardless
        }
        clearTokens()
        set({ user: null, isAuthenticated: false })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'hha-admin-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
)

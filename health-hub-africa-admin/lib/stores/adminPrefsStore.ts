'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Client-only display preferences for the admin app. Mirrors the shape of
// the patient portal's settingsStore so the API choreography stays parallel,
// even though the admin User table has no language/dateFormat columns —
// these survive only within the device that set them, which is the right
// default for cosmetic prefs on a staff account.
interface AdminPrefsState {
  language: string
  dateFormat: string
  set: (patch: Partial<Omit<AdminPrefsState, 'set'>>) => void
}

export const useAdminPrefsStore = create<AdminPrefsState>()(
  persist(
    (set) => ({
      language: 'en',
      dateFormat: 'dd/mm/yyyy',
      set: (patch) => set((s) => ({ ...s, ...patch })),
    }),
    { name: 'hha-admin-prefs' },
  ),
)

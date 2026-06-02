'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Security
  twoFa: boolean

  // Notifications
  emailNotifs: boolean
  smsAlerts: boolean
  pushNotifs: boolean
  appointmentReminders: boolean
  labResults: boolean
  paymentReceipts: boolean
  marketingEmails: boolean

  // Privacy
  dataSharing: boolean
  analyticsConsent: boolean
  researchConsent: boolean

  // Appearance
  language: string
  dateFormat: string

  // Actions
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      twoFa: false,
      emailNotifs: true,
      smsAlerts: true,
      pushNotifs: false,
      appointmentReminders: true,
      labResults: true,
      paymentReceipts: true,
      marketingEmails: false,
      dataSharing: false,
      analyticsConsent: true,
      researchConsent: false,
      language: 'en',
      dateFormat: 'dd/mm/yyyy',
      set: (patch) => set((s) => ({ ...s, ...patch })),
    }),
    { name: 'hha-settings' }
  )
)

'use client'

import { create } from 'zustand'

type Screen =
  | 'login'
  | 'dashboard'
  | 'profile'
  | 'appointments'
  | 'records'
  | 'labs'
  | 'telecare'
  | 'dispatch'
  | 'subscriptions'
  | 'payments'
  | 'stride'
  | 'settings'

interface AppStore {
  activeScreen: Screen
  isMobilePanelOpen: boolean
  setActiveScreen: (screen: Screen) => void
  openMobilePanel: () => void
  closeMobilePanel: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  activeScreen: 'dashboard',
  isMobilePanelOpen: false,
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  openMobilePanel: () => set({ isMobilePanelOpen: true }),
  closeMobilePanel: () => set({ isMobilePanelOpen: false }),
}))

export type { Screen }

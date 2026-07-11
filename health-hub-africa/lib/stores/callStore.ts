'use client'

import { create } from 'zustand'

interface CallState {
  isInCall: boolean
  setInCall: (value: boolean) => void
}

export const useCallStore = create<CallState>()((set) => ({
  isInCall: false,
  setInCall: (value) => set({ isInCall: value }),
}))

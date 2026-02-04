import { create } from 'zustand'
import type { SessionUsageData } from '@shared/session-usage-types'

interface SessionUsageState {
  usage: SessionUsageData | null

  setUsage: (data: SessionUsageData | null) => void
  fetchUsage: () => Promise<void>
  refreshUsage: () => Promise<void>
  setApiKey: (apiKey: string | null) => Promise<void>
}

export const useSessionUsageStore = create<SessionUsageState>((set) => ({
  usage: null,

  setUsage: (data) => set({ usage: data }),

  fetchUsage: async () => {
    const data = await window.api.getSessionUsage()
    set({ usage: data })
  },

  refreshUsage: async () => {
    const data = await window.api.refreshSessionUsage()
    set({ usage: data })
  },

  setApiKey: async (apiKey) => {
    const data = await window.api.setSessionUsageApiKey(apiKey)
    set({ usage: data })
  }
}))

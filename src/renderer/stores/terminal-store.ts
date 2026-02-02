import { create } from 'zustand'

interface TerminalState {
  buffers: Record<string, string>

  appendData: (serviceId: string, data: string) => void
  setBuffer: (serviceId: string, data: string) => void
  clearBuffer: (serviceId: string) => void
  clearAll: () => void
}

export const useTerminalStore = create<TerminalState>((set) => ({
  buffers: {},

  appendData: (serviceId, data) =>
    set((state) => ({
      buffers: {
        ...state.buffers,
        [serviceId]: (state.buffers[serviceId] || '') + data
      }
    })),

  setBuffer: (serviceId, data) =>
    set((state) => ({
      buffers: {
        ...state.buffers,
        [serviceId]: data
      }
    })),

  clearBuffer: (serviceId) =>
    set((state) => {
      const { [serviceId]: _, ...rest } = state.buffers
      return { buffers: rest }
    }),

  clearAll: () => set({ buffers: {} })
}))

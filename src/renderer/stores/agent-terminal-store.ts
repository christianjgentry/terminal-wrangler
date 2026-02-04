import { create } from 'zustand'

interface AgentTerminalState {
  buffers: Record<string, string>

  appendData: (agentId: string, data: string) => void
  setBuffer: (agentId: string, data: string) => void
  clearBuffer: (agentId: string) => void
  clearAll: () => void
}

export const useAgentTerminalStore = create<AgentTerminalState>((set) => ({
  buffers: {},

  appendData: (agentId, data) =>
    set((state) => ({
      buffers: {
        ...state.buffers,
        [agentId]: (state.buffers[agentId] || '') + data
      }
    })),

  setBuffer: (agentId, data) =>
    set((state) => ({
      buffers: {
        ...state.buffers,
        [agentId]: data
      }
    })),

  clearBuffer: (agentId) =>
    set((state) => {
      const { [agentId]: _, ...rest } = state.buffers
      return { buffers: rest }
    }),

  clearAll: () => set({ buffers: {} })
}))

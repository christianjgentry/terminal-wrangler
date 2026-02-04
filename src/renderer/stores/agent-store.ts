import { create } from 'zustand'
import type { AgentStatus, AgentInfo } from '@shared/agent-types'

interface AgentState {
  agents: Record<string, AgentInfo>
  selectedAgentId: string | null

  addAgent: (agent: AgentInfo) => void
  removeAgent: (agentId: string) => void
  updateStatus: (agentId: string, status: AgentStatus) => void
  addSubagent: (parentAgentId: string, subagent: AgentInfo) => void
  setPrUrl: (agentId: string, prUrl: string) => void
  setSelectedAgentId: (id: string | null) => void
  getAgentsByStatus: (status: AgentStatus) => AgentInfo[]
  setAgents: (agents: AgentInfo[]) => void
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: {},
  selectedAgentId: null,

  addAgent: (agent) =>
    set((state) => ({
      agents: { ...state.agents, [agent.id]: agent }
    })),

  removeAgent: (agentId) =>
    set((state) => {
      const { [agentId]: _, ...rest } = state.agents
      return {
        agents: rest,
        selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId
      }
    }),

  updateStatus: (agentId, status) =>
    set((state) => {
      const agent = state.agents[agentId]
      if (!agent) return state
      return {
        agents: {
          ...state.agents,
          [agentId]: { ...agent, status }
        }
      }
    }),

  addSubagent: (parentAgentId, subagent) =>
    set((state) => {
      const parent = state.agents[parentAgentId]
      if (!parent) return state
      return {
        agents: {
          ...state.agents,
          [parentAgentId]: {
            ...parent,
            subagents: [...parent.subagents, { ...subagent, parentAgentId, detectedAt: subagent.createdAt }]
          },
          [subagent.id]: subagent
        }
      }
    }),

  setPrUrl: (agentId, prUrl) =>
    set((state) => {
      const agent = state.agents[agentId]
      if (!agent) return state
      return {
        agents: {
          ...state.agents,
          [agentId]: { ...agent, detectedPrUrl: prUrl }
        }
      }
    }),

  setSelectedAgentId: (id) => set({ selectedAgentId: id }),

  getAgentsByStatus: (status) => {
    return Object.values(get().agents).filter((a) => a.status === status)
  },

  setAgents: (agents) =>
    set({
      agents: Object.fromEntries(agents.map((a) => [a.id, a]))
    })
}))

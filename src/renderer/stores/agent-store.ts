import { create } from 'zustand'
import type { AgentStatus, AgentInfo, AgentTask } from '@shared/agent-types'

interface AgentState {
  agents: Record<string, AgentInfo>
  selectedAgentId: string | null

  addAgent: (agent: AgentInfo) => void
  removeAgent: (agentId: string) => void
  updateStatus: (agentId: string, status: AgentStatus) => void
  addSubagent: (parentAgentId: string, subagent: AgentInfo) => void
  setPrUrl: (agentId: string, prUrl: string) => void
  setPlanFilePath: (agentId: string, planFilePath: string) => void
  updateContextUsage: (agentId: string, used: number, max: number) => void
  updateTasks: (agentId: string, tasks: AgentTask[]) => void
  setProcessAlive: (agentId: string, alive: boolean) => void
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

  setPlanFilePath: (agentId, planFilePath) =>
    set((state) => {
      const agent = state.agents[agentId]
      if (!agent) return state
      return {
        agents: {
          ...state.agents,
          [agentId]: { ...agent, planFilePath }
        }
      }
    }),

  updateContextUsage: (agentId, used, max) =>
    set((state) => {
      const agent = state.agents[agentId]
      if (!agent) return state
      return {
        agents: {
          ...state.agents,
          [agentId]: { ...agent, contextUsage: { used, max } }
        }
      }
    }),

  updateTasks: (agentId, tasks) =>
    set((state) => {
      const agent = state.agents[agentId]
      if (!agent) return state
      return {
        agents: {
          ...state.agents,
          [agentId]: { ...agent, tasks }
        }
      }
    }),

  setProcessAlive: (agentId, alive) =>
    set((state) => {
      const agent = state.agents[agentId]
      if (!agent) return state
      return {
        agents: {
          ...state.agents,
          [agentId]: { ...agent, processAlive: alive }
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

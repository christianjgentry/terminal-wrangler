import { create } from 'zustand'
import type { PrInfo, GitHubProjectStatus } from '@shared/github-types'

interface GitHubState {
  prInfoByAgent: Record<string, PrInfo>
  projectStatus: GitHubProjectStatus | null

  setPrInfo: (agentId: string, prInfo: PrInfo) => void
  setProjectStatus: (status: GitHubProjectStatus) => void
  getTrackedPrCount: () => number
}

export const useGithubStore = create<GitHubState>((set, get) => ({
  prInfoByAgent: {},
  projectStatus: null,

  setPrInfo: (agentId, prInfo) =>
    set((state) => ({
      prInfoByAgent: { ...state.prInfoByAgent, [agentId]: prInfo }
    })),

  setProjectStatus: (status) => set({ projectStatus: status }),

  getTrackedPrCount: () => Object.keys(get().prInfoByAgent).length
}))

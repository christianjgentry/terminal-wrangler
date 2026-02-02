import { create } from 'zustand'
import type { ProjectDocsData } from '@shared/types'

interface DocsState {
  docsData: ProjectDocsData | null
  isLoading: boolean
  error: string | null
  activeEnvironmentTab: string | null
  activeContentTab: 'readme' | 'scripts'
  runningCommands: Set<string>

  setDocsData: (data: ProjectDocsData) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setActiveEnvironmentTab: (tab: string | null) => void
  setActiveContentTab: (tab: 'readme' | 'scripts') => void
  addRunningCommand: (id: string) => void
  removeRunningCommand: (id: string) => void
  clearDocs: () => void
}

export const useDocsStore = create<DocsState>((set) => ({
  docsData: null,
  isLoading: false,
  error: null,
  activeEnvironmentTab: null,
  activeContentTab: 'readme',
  runningCommands: new Set(),

  setDocsData: (data) =>
    set({
      docsData: data,
      activeEnvironmentTab: data.environments[0] ?? null,
      activeContentTab: data.readme ? 'readme' : 'scripts'
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setActiveEnvironmentTab: (tab) => set({ activeEnvironmentTab: tab }),
  setActiveContentTab: (tab) => set({ activeContentTab: tab }),
  addRunningCommand: (id) =>
    set((state) => {
      const next = new Set(state.runningCommands)
      next.add(id)
      return { runningCommands: next }
    }),
  removeRunningCommand: (id) =>
    set((state) => {
      const next = new Set(state.runningCommands)
      next.delete(id)
      return { runningCommands: next }
    }),
  clearDocs: () =>
    set({
      docsData: null,
      isLoading: false,
      error: null,
      activeEnvironmentTab: null,
      activeContentTab: 'readme',
      runningCommands: new Set()
    })
}))

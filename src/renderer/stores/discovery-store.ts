import { create } from 'zustand'
import { createRendererLogger } from '../lib/logger'
import type { AnyArtifact, AddFileArtifactRequest, AddLinkArtifactRequest } from '@shared/discovery-types'

const logger = createRendererLogger('DiscoveryStore')

interface DiscoveryState {
  initialized: boolean
  artifacts: AnyArtifact[]
  loading: boolean
  error: string | null
  addFileDialogOpen: boolean
  addLinkDialogOpen: boolean

  checkExists: (projectPath: string) => Promise<void>
  initFolder: (projectPath: string) => Promise<void>
  fetchArtifacts: (projectPath: string) => Promise<void>
  addFiles: (projectPath: string, request: AddFileArtifactRequest) => Promise<void>
  addLink: (projectPath: string, request: AddLinkArtifactRequest) => Promise<void>
  removeArtifact: (projectPath: string, id: string) => Promise<void>
  setAddFileDialogOpen: (open: boolean) => void
  setAddLinkDialogOpen: (open: boolean) => void
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  initialized: false,
  artifacts: [],
  loading: false,
  error: null,
  addFileDialogOpen: false,
  addLinkDialogOpen: false,

  checkExists: async (projectPath) => {
    try {
      const exists = await window.api.discoveryExists(projectPath)
      set({ initialized: exists })
      if (exists) {
        await get().fetchArtifacts(projectPath)
      }
    } catch (err) {
      logger.error('Failed to check discovery folder:', err)
      set({ error: err instanceof Error ? err.message : String(err) })
    }
  },

  initFolder: async (projectPath) => {
    set({ loading: true, error: null })
    try {
      await window.api.initDiscovery(projectPath)
      set({ initialized: true, loading: false })
      await get().fetchArtifacts(projectPath)
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  fetchArtifacts: async (projectPath) => {
    set({ loading: true, error: null })
    try {
      const artifacts = await window.api.listDiscoveryArtifacts(projectPath)
      set({ artifacts, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  addFiles: async (projectPath, request) => {
    set({ loading: true, error: null })
    try {
      await window.api.addDiscoveryFiles(projectPath, request)
      await get().fetchArtifacts(projectPath)
      set({ addFileDialogOpen: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  addLink: async (projectPath, request) => {
    set({ loading: true, error: null })
    try {
      await window.api.addDiscoveryLink(projectPath, request)
      await get().fetchArtifacts(projectPath)
      set({ addLinkDialogOpen: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  removeArtifact: async (projectPath, id) => {
    try {
      await window.api.removeDiscoveryArtifact(projectPath, id)
      set((state) => ({
        artifacts: state.artifacts.filter((a) => a.id !== id)
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
    }
  },

  setAddFileDialogOpen: (open) => set({ addFileDialogOpen: open }),
  setAddLinkDialogOpen: (open) => set({ addLinkDialogOpen: open })
}))

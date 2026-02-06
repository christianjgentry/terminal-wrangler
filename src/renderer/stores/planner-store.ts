import { create } from 'zustand'
import { useAgentStore } from './agent-store'
import { useAppStore } from './app-store'
import type { StandardsFile } from '@shared/planner-types'

interface PlannerState {
  standardsDir: string
  standardsFiles: StandardsFile[]
  selectedFile: string | null
  fileContent: string | null
  editMode: boolean
  editBuffer: string
  featureDescription: string
  includeConfluence: boolean
  loading: boolean
  saving: boolean
  spawning: boolean
  error: string | null
  dirDialogOpen: boolean

  fetchStandardsDir: () => Promise<void>
  setStandardsDir: (dir: string) => Promise<void>
  fetchFiles: () => Promise<void>
  selectFile: (relativePath: string) => Promise<void>
  clearSelectedFile: () => void
  setEditMode: (mode: boolean) => void
  setEditBuffer: (content: string) => void
  saveFile: () => Promise<void>
  setFeatureDescription: (text: string) => void
  setIncludeConfluence: (include: boolean) => void
  setDirDialogOpen: (open: boolean) => void
  spawnPlannerAgent: (projectKey?: string) => Promise<void>
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  standardsDir: '',
  standardsFiles: [],
  selectedFile: null,
  fileContent: null,
  editMode: false,
  editBuffer: '',
  featureDescription: '',
  includeConfluence: false,
  loading: false,
  saving: false,
  spawning: false,
  error: null,
  dirDialogOpen: false,

  fetchStandardsDir: async () => {
    try {
      const dir = await window.api.getStandardsDir()
      set({ standardsDir: dir })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
    }
  },

  setStandardsDir: async (dir) => {
    try {
      await window.api.setStandardsDir(dir)
      set({ standardsDir: dir, selectedFile: null, fileContent: null, editMode: false })
      await get().fetchFiles()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
    }
  },

  fetchFiles: async () => {
    set({ loading: true, error: null })
    try {
      const files = await window.api.listStandardsFiles()
      set({ standardsFiles: files, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false, standardsFiles: [] })
    }
  },

  selectFile: async (relativePath) => {
    set({ loading: true, error: null, editMode: false })
    try {
      const content = await window.api.readStandardsFile(relativePath)
      set({ selectedFile: relativePath, fileContent: content, editBuffer: content, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  clearSelectedFile: () => set({ selectedFile: null, fileContent: null, editMode: false }),

  setEditMode: (mode) => {
    const { fileContent } = get()
    set({ editMode: mode, editBuffer: fileContent || '' })
  },

  setEditBuffer: (content) => set({ editBuffer: content }),

  saveFile: async () => {
    const { selectedFile, editBuffer } = get()
    if (!selectedFile) return
    set({ saving: true, error: null })
    try {
      await window.api.writeStandardsFile(selectedFile, editBuffer)
      set({ saving: false, fileContent: editBuffer, editMode: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), saving: false })
    }
  },

  setFeatureDescription: (text) => set({ featureDescription: text }),
  setIncludeConfluence: (include) => set({ includeConfluence: include }),
  setDirDialogOpen: (open) => set({ dirDialogOpen: open }),

  spawnPlannerAgent: async (projectKey) => {
    const { featureDescription, includeConfluence } = get()
    if (!featureDescription.trim()) return
    set({ spawning: true, error: null })
    try {
      const agent = await window.api.spawnPlannerAgent({
        featureDescription: featureDescription.trim(),
        projectKey,
        includeConfluence
      })
      useAgentStore.getState().addAgent(agent)
      useAppStore.getState().setActiveView('agents')
      set({ spawning: false, featureDescription: '' })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), spawning: false })
    }
  }
}))

import { create } from 'zustand'
import type { JiraCredentials, JiraConnectionResult, JiraEpic, JiraStory } from '@shared/jira-types'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface JiraState {
  credentials: JiraCredentials | null
  connectionStatus: ConnectionStatus
  connectionError: string | null
  displayName: string | null
  selectedProjectKey: string | null
  epics: JiraEpic[]
  storiesByEpic: Record<string, JiraStory[]>
  expandedEpicKey: string | null
  selectedStoryKeys: Set<string>
  selectedStoryDetail: JiraStory | null
  loading: boolean
  error: string | null
  spawnDialogOpen: boolean

  setCredentials: (creds: JiraCredentials | null) => void
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void
  setDisplayName: (name: string | null) => void
  setSelectedProjectKey: (key: string | null) => void
  setEpics: (epics: JiraEpic[]) => void
  setStoriesForEpic: (epicKey: string, stories: JiraStory[]) => void
  setExpandedEpicKey: (key: string | null) => void
  toggleStorySelection: (storyKey: string) => void
  selectAllStoriesForEpic: (epicKey: string) => void
  clearStorySelection: () => void
  setSelectedStoryDetail: (story: JiraStory | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSpawnDialogOpen: (open: boolean) => void
  getSelectedStories: () => JiraStory[]

  fetchCredentials: () => Promise<void>
  saveCredentials: (creds: JiraCredentials) => Promise<void>
  testConnection: (creds: JiraCredentials) => Promise<JiraConnectionResult>
  fetchEpics: (projectKey: string) => Promise<void>
  fetchStoriesForEpic: (epicKey: string) => Promise<void>
  refreshEpics: () => Promise<void>
}

export const useJiraStore = create<JiraState>((set, get) => ({
  credentials: null,
  connectionStatus: 'disconnected',
  connectionError: null,
  displayName: null,
  selectedProjectKey: null,
  epics: [],
  storiesByEpic: {},
  expandedEpicKey: null,
  selectedStoryKeys: new Set(),
  selectedStoryDetail: null,
  loading: false,
  error: null,
  spawnDialogOpen: false,

  setCredentials: (creds) => set({ credentials: creds }),
  setConnectionStatus: (status, error) => set({ connectionStatus: status, connectionError: error || null }),
  setDisplayName: (name) => set({ displayName: name }),
  setSelectedProjectKey: (key) => set({ selectedProjectKey: key }),
  setEpics: (epics) => set({ epics }),
  setStoriesForEpic: (epicKey, stories) =>
    set((state) => ({
      storiesByEpic: { ...state.storiesByEpic, [epicKey]: stories }
    })),
  setExpandedEpicKey: (key) => set({ expandedEpicKey: key }),
  toggleStorySelection: (storyKey) =>
    set((state) => {
      const next = new Set(state.selectedStoryKeys)
      if (next.has(storyKey)) {
        next.delete(storyKey)
      } else {
        next.add(storyKey)
      }
      return { selectedStoryKeys: next }
    }),
  selectAllStoriesForEpic: (epicKey) =>
    set((state) => {
      const stories = state.storiesByEpic[epicKey] || []
      const next = new Set(state.selectedStoryKeys)
      for (const s of stories) {
        next.add(s.key)
      }
      return { selectedStoryKeys: next }
    }),
  clearStorySelection: () => set({ selectedStoryKeys: new Set() }),
  setSelectedStoryDetail: (story) => set({ selectedStoryDetail: story }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSpawnDialogOpen: (open) => set({ spawnDialogOpen: open }),

  getSelectedStories: () => {
    const state = get()
    const keys = state.selectedStoryKeys
    const all: JiraStory[] = []
    for (const stories of Object.values(state.storiesByEpic)) {
      for (const story of stories) {
        if (keys.has(story.key)) all.push(story)
      }
    }
    return all
  },

  fetchCredentials: async () => {
    const creds = await window.api.getJiraCredentials()
    if (creds) {
      set({ credentials: creds })
      const result = await window.api.testJiraConnection(creds)
      if (result.connected) {
        set({ connectionStatus: 'connected', displayName: result.displayName || null })
        const projectKey = await window.api.getJiraProjectKey()
        if (projectKey) {
          set({ selectedProjectKey: projectKey })
          get().fetchEpics(projectKey)
        }
      } else {
        set({ connectionStatus: 'error', connectionError: result.error || 'Connection failed' })
      }
    }
  },

  saveCredentials: async (creds) => {
    await window.api.setJiraCredentials(creds)
    set({ credentials: creds })
  },

  testConnection: async (creds) => {
    set({ connectionStatus: 'connecting' })
    const result = await window.api.testJiraConnection(creds)
    if (result.connected) {
      set({ connectionStatus: 'connected', displayName: result.displayName || null, connectionError: null })
    } else {
      set({ connectionStatus: 'error', connectionError: result.error || 'Connection failed' })
    }
    return result
  },

  fetchEpics: async (projectKey) => {
    set({ loading: true, error: null })
    try {
      const epics = await window.api.getJiraEpics(projectKey)
      set({ epics, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  fetchStoriesForEpic: async (epicKey) => {
    try {
      const stories = await window.api.getJiraStoriesByEpic(epicKey)
      set((state) => ({
        storiesByEpic: { ...state.storiesByEpic, [epicKey]: stories }
      }))
    } catch (err) {
      console.error('Failed to fetch stories for epic:', epicKey, err)
    }
  },

  refreshEpics: async () => {
    const { selectedProjectKey } = get()
    if (!selectedProjectKey) return
    set({ loading: true, error: null })
    try {
      const epics = await window.api.refreshJiraEpics(selectedProjectKey)
      set({ epics, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  }
}))

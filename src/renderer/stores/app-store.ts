import { create } from 'zustand'
import type { RecentProject } from '@shared/types'

export type ActiveView = 'services' | 'agents' | 'jira'

interface AppState {
  projectPath: string | null
  projectName: string | null
  selectedServiceId: string | null
  terminalPanelOpen: boolean
  terminalPanelHeight: number
  sidebarOpen: boolean
  sidebarWidth: number
  activeTerminalTab: string | null
  recentProjects: RecentProject[]
  configError: string | null
  docsPanelOpen: boolean
  docsPanelWidth: number
  activeView: ActiveView
  activeAgentTerminalTab: string | null
  agentTerminalPanelOpen: boolean
  agentPlanViewId: string | null

  setProjectPath: (path: string | null) => void
  setProjectName: (name: string | null) => void
  setSelectedServiceId: (id: string | null) => void
  setTerminalPanelOpen: (open: boolean) => void
  setTerminalPanelHeight: (height: number) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  setActiveTerminalTab: (id: string | null) => void
  setRecentProjects: (projects: RecentProject[]) => void
  setConfigError: (error: string | null) => void
  setDocsPanelOpen: (open: boolean) => void
  setDocsPanelWidth: (width: number) => void
  setActiveView: (view: ActiveView) => void
  setActiveAgentTerminalTab: (id: string | null) => void
  setAgentTerminalPanelOpen: (open: boolean) => void
  setAgentPlanViewId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  projectPath: null,
  projectName: null,
  selectedServiceId: null,
  terminalPanelOpen: false,
  terminalPanelHeight: 300,
  sidebarOpen: false,
  sidebarWidth: 320,
  activeTerminalTab: null,
  recentProjects: [],
  configError: null,
  docsPanelOpen: false,
  docsPanelWidth: 320,
  activeView: 'services' as ActiveView,
  activeAgentTerminalTab: null,
  agentTerminalPanelOpen: false,
  agentPlanViewId: null,

  setProjectPath: (path) => set({ projectPath: path }),
  setProjectName: (name) => set({ projectName: name }),
  setSelectedServiceId: (id) => set({
    selectedServiceId: id,
    sidebarOpen: id !== null,
    ...(id !== null ? { activeTerminalTab: id, terminalPanelOpen: true } : {})
  }),
  setTerminalPanelOpen: (open) => set({ terminalPanelOpen: open }),
  setTerminalPanelHeight: (height) => set({ terminalPanelHeight: height }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setActiveTerminalTab: (id) => set({ activeTerminalTab: id }),
  setRecentProjects: (projects) => set({ recentProjects: projects }),
  setConfigError: (error) => set({ configError: error }),
  setDocsPanelOpen: (open) => set({ docsPanelOpen: open }),
  setDocsPanelWidth: (width) => set({ docsPanelWidth: width }),
  setActiveView: (view) => set({ activeView: view }),
  setActiveAgentTerminalTab: (id) => set({ activeAgentTerminalTab: id, agentPlanViewId: null }),
  setAgentTerminalPanelOpen: (open) => set({ agentTerminalPanelOpen: open }),
  setAgentPlanViewId: (id) => set({ agentPlanViewId: id })
}))

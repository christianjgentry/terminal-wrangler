import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { AppSettings, ProjectDocsData } from '@shared/types'
import type { AgentInfo, AgentTask, CreateAgentRequest } from '@shared/agent-types'
import type { GhAuthStatus, GitRemoteInfo, PrInfo, GitHubProjectStatus, MergeResult } from '@shared/github-types'
import type { SessionUsageData } from '@shared/session-usage-types'
import type { JiraCredentials, JiraConnectionResult, JiraEpic, JiraStory, JiraTransition } from '@shared/jira-types'

const api = {
  // Dialog
  openFileDialog: (defaultPath?: string): Promise<string[] | null> =>
    ipcRenderer.invoke(IPC.DIALOG_OPEN_FILES, defaultPath),

  // File utilities
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  // Project
  openProject: (): Promise<string | null> => ipcRenderer.invoke(IPC.PROJECT_OPEN),
  openRecentProject: (path: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROJECT_OPEN_RECENT, path),

  // Config
  loadConfig: (projectPath: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC.CONFIG_LOAD, projectPath),
  generateConfig: (projectPath: string): Promise<{ yaml: string; config: unknown; detectedFiles: string[] }> =>
    ipcRenderer.invoke(IPC.CONFIG_GENERATE, projectPath),
  saveGeneratedConfig: (projectPath: string, yamlContent: string): Promise<void> =>
    ipcRenderer.invoke(IPC.CONFIG_SAVE, projectPath, yamlContent),
  onConfigChanged: (callback: (config: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, config: unknown): void => callback(config)
    ipcRenderer.on(IPC.CONFIG_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.CONFIG_CHANGED, handler)
  },
  onConfigError: (callback: (error: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string): void => callback(error)
    ipcRenderer.on(IPC.CONFIG_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC.CONFIG_ERROR, handler)
  },

  // Process management
  startService: (serviceId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROCESS_START, serviceId),
  stopService: (serviceId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROCESS_STOP, serviceId),
  restartService: (serviceId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROCESS_RESTART, serviceId),
  startAll: (): Promise<void> => ipcRenderer.invoke(IPC.PROCESS_START_ALL),
  stopAll: (): Promise<void> => ipcRenderer.invoke(IPC.PROCESS_STOP_ALL),

  // Status events
  onServiceStatusChanged: (
    callback: (data: { serviceId: string; status: string; pid?: number }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { serviceId: string; status: string; pid?: number }
    ): void => callback(data)
    ipcRenderer.on(IPC.SERVICE_STATUS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.SERVICE_STATUS_CHANGED, handler)
  },
  onServiceExit: (
    callback: (data: { serviceId: string; exitCode: number | null }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { serviceId: string; exitCode: number | null }
    ): void => callback(data)
    ipcRenderer.on(IPC.SERVICE_EXIT, handler)
    return () => ipcRenderer.removeListener(IPC.SERVICE_EXIT, handler)
  },

  // Terminal
  onTerminalData: (callback: (data: { serviceId: string; data: string }) => void): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { serviceId: string; data: string }
    ): void => callback(data)
    ipcRenderer.on(IPC.TERMINAL_DATA, handler)
    return () => ipcRenderer.removeListener(IPC.TERMINAL_DATA, handler)
  },
  sendTerminalInput: (serviceId: string, data: string): void => {
    ipcRenderer.send(IPC.TERMINAL_INPUT, { serviceId, data })
  },
  resizeTerminal: (serviceId: string, cols: number, rows: number): void => {
    ipcRenderer.send(IPC.TERMINAL_RESIZE, { serviceId, cols, rows })
  },
  getTerminalBuffer: (serviceId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.TERMINAL_GET_BUFFER, serviceId),

  // Health checks
  onHealthCheckResult: (
    callback: (data: { serviceId: string; healthy: boolean; output?: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { serviceId: string; healthy: boolean; output?: string }
    ): void => callback(data)
    ipcRenderer.on(IPC.HEALTH_CHECK_RESULT, handler)
    return () => ipcRenderer.removeListener(IPC.HEALTH_CHECK_RESULT, handler)
  },

  // App settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.APP_GET_SETTINGS),
  saveSettings: (settings: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.APP_SAVE_SETTINGS, settings),
  getRecentProjects: (): Promise<Array<{ path: string; name: string; lastOpened: number }>> =>
    ipcRenderer.invoke(IPC.APP_GET_RECENT_PROJECTS),

  // Docs panel
  getProjectDocs: (projectPath: string): Promise<ProjectDocsData> =>
    ipcRenderer.invoke(IPC.DOCS_GET_PROJECT_DOCS, projectPath),
  runDocsCommand: (commandId: string, command: string, cwd: string, projectPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOCS_RUN_COMMAND, commandId, command, cwd, projectPath),
  stopDocsCommand: (commandId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOCS_COMMAND_STOP, commandId),
  sendDocsCommandInput: (commandId: string, data: string): void => {
    ipcRenderer.send(IPC.DOCS_COMMAND_INPUT, { commandId, data })
  },
  resizeDocsCommand: (commandId: string, cols: number, rows: number): void => {
    ipcRenderer.send(IPC.DOCS_COMMAND_RESIZE, { commandId, cols, rows })
  },
  getDocsCommandBuffer: (commandId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.DOCS_COMMAND_GET_BUFFER, commandId),
  onDocsCommandOutput: (
    callback: (data: { commandId: string; data: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { commandId: string; data: string }
    ): void => callback(data)
    ipcRenderer.on(IPC.DOCS_COMMAND_OUTPUT, handler)
    return () => ipcRenderer.removeListener(IPC.DOCS_COMMAND_OUTPUT, handler)
  },
  onDocsCommandExit: (
    callback: (data: { commandId: string; exitCode: number }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { commandId: string; exitCode: number }
    ): void => callback(data)
    ipcRenderer.on(IPC.DOCS_COMMAND_EXIT, handler)
    return () => ipcRenderer.removeListener(IPC.DOCS_COMMAND_EXIT, handler)
  },

  // Agent management
  createAgent: (request: CreateAgentRequest): Promise<AgentInfo> =>
    ipcRenderer.invoke(IPC.AGENT_CREATE, request),
  stopAgent: (agentId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.AGENT_STOP, agentId),
  removeAgent: (agentId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.AGENT_REMOVE, agentId),
  stopAllAgents: (): Promise<void> =>
    ipcRenderer.invoke(IPC.AGENT_STOP_ALL),
  getAllAgents: (): Promise<AgentInfo[]> =>
    ipcRenderer.invoke(IPC.AGENT_GET_ALL),
  getAgentState: (agentId: string): Promise<AgentInfo | null> =>
    ipcRenderer.invoke(IPC.AGENT_GET_STATE, agentId),
  markAgentDone: (agentId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.AGENT_MARK_DONE, agentId),
  getAgentPlanContent: (agentId: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.AGENT_GET_PLAN_CONTENT, agentId),
  saveAgentPlan: (agentId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.AGENT_SAVE_PLAN, agentId),

  // Agent events
  onAgentStatusChanged: (
    callback: (data: { agentId: string; status: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { agentId: string; status: string }
    ): void => callback(data)
    ipcRenderer.on(IPC.AGENT_STATUS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.AGENT_STATUS_CHANGED, handler)
  },
  onAgentExit: (
    callback: (data: { agentId: string; exitCode: number | null }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { agentId: string; exitCode: number | null }
    ): void => callback(data)
    ipcRenderer.on(IPC.AGENT_EXIT, handler)
    return () => ipcRenderer.removeListener(IPC.AGENT_EXIT, handler)
  },
  onAgentSubagentDetected: (
    callback: (data: { agentId: string; subagent: AgentInfo }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { agentId: string; subagent: AgentInfo }
    ): void => callback(data)
    ipcRenderer.on(IPC.AGENT_SUBAGENT_DETECTED, handler)
    return () => ipcRenderer.removeListener(IPC.AGENT_SUBAGENT_DETECTED, handler)
  },
  onAgentPrDetected: (
    callback: (data: { agentId: string; prUrl: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { agentId: string; prUrl: string }
    ): void => callback(data)
    ipcRenderer.on(IPC.AGENT_PR_DETECTED, handler)
    return () => ipcRenderer.removeListener(IPC.AGENT_PR_DETECTED, handler)
  },
  onAgentContextUsage: (
    callback: (data: { agentId: string; used: number; max: number }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { agentId: string; used: number; max: number }
    ): void => callback(data)
    ipcRenderer.on(IPC.AGENT_CONTEXT_USAGE, handler)
    return () => ipcRenderer.removeListener(IPC.AGENT_CONTEXT_USAGE, handler)
  },
  onAgentTasksChanged: (
    callback: (data: { agentId: string; tasks: AgentTask[] }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { agentId: string; tasks: AgentTask[] }
    ): void => callback(data)
    ipcRenderer.on(IPC.AGENT_TASKS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.AGENT_TASKS_CHANGED, handler)
  },
  onAgentPlanDetected: (
    callback: (data: { agentId: string; planFilePath: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { agentId: string; planFilePath: string }
    ): void => callback(data)
    ipcRenderer.on(IPC.AGENT_PLAN_DETECTED, handler)
    return () => ipcRenderer.removeListener(IPC.AGENT_PLAN_DETECTED, handler)
  },

  // Agent terminal
  onAgentTerminalData: (
    callback: (data: { agentId: string; data: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { agentId: string; data: string }
    ): void => callback(data)
    ipcRenderer.on(IPC.AGENT_TERMINAL_DATA, handler)
    return () => ipcRenderer.removeListener(IPC.AGENT_TERMINAL_DATA, handler)
  },
  sendAgentTerminalInput: (agentId: string, data: string): void => {
    ipcRenderer.send(IPC.AGENT_TERMINAL_INPUT, { agentId, data })
  },
  resizeAgentTerminal: (agentId: string, cols: number, rows: number): void => {
    ipcRenderer.send(IPC.AGENT_TERMINAL_RESIZE, { agentId, cols, rows })
  },
  getAgentTerminalBuffer: (agentId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.AGENT_TERMINAL_GET_BUFFER, agentId),

  // GitHub integration
  getGithubAuthStatus: (): Promise<GhAuthStatus> =>
    ipcRenderer.invoke(IPC.GITHUB_GET_AUTH_STATUS),
  getGitRemote: (cwd: string): Promise<GitRemoteInfo | null> =>
    ipcRenderer.invoke(IPC.GITHUB_GET_REMOTE, cwd),
  getGithubPrInfo: (prUrl: string): Promise<PrInfo | null> =>
    ipcRenderer.invoke(IPC.GITHUB_GET_PR_INFO, prUrl),
  listGithubPrs: (cwd: string): Promise<PrInfo[]> =>
    ipcRenderer.invoke(IPC.GITHUB_LIST_PRS, cwd),
  getGithubProjectStatus: (cwd: string): Promise<GitHubProjectStatus> =>
    ipcRenderer.invoke(IPC.GITHUB_GET_PROJECT_STATUS, cwd),
  mergePr: (prUrl: string): Promise<MergeResult> =>
    ipcRenderer.invoke(IPC.GITHUB_MERGE_PR, prUrl),
  getPrDiff: (prUrl: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.GITHUB_GET_PR_DIFF, prUrl),
  onGithubPrInfoUpdated: (
    callback: (data: { agentId: string; prInfo: PrInfo }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { agentId: string; prInfo: PrInfo }
    ): void => callback(data)
    ipcRenderer.on(IPC.GITHUB_PR_INFO_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC.GITHUB_PR_INFO_UPDATED, handler)
  },

  // Session usage
  getSessionUsage: (): Promise<SessionUsageData | null> =>
    ipcRenderer.invoke(IPC.SESSION_USAGE_GET),
  refreshSessionUsage: (): Promise<SessionUsageData | null> =>
    ipcRenderer.invoke(IPC.SESSION_USAGE_REFRESH),
  setSessionUsageApiKey: (apiKey: string | null): Promise<SessionUsageData | null> =>
    ipcRenderer.invoke(IPC.SESSION_USAGE_SET_API_KEY, apiKey),
  onSessionUsageChanged: (
    callback: (data: SessionUsageData | null) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: SessionUsageData | null
    ): void => callback(data)
    ipcRenderer.on(IPC.SESSION_USAGE_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.SESSION_USAGE_CHANGED, handler)
  },

  // Jira integration
  getJiraCredentials: (): Promise<JiraCredentials | null> =>
    ipcRenderer.invoke(IPC.JIRA_GET_CREDENTIALS),
  setJiraCredentials: (creds: JiraCredentials): Promise<void> =>
    ipcRenderer.invoke(IPC.JIRA_SET_CREDENTIALS, creds),
  testJiraConnection: (creds: JiraCredentials): Promise<JiraConnectionResult> =>
    ipcRenderer.invoke(IPC.JIRA_TEST_CONNECTION, creds),
  getJiraProjectKey: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.JIRA_GET_PROJECT_KEY),
  setJiraProjectKey: (key: string): Promise<void> =>
    ipcRenderer.invoke(IPC.JIRA_SET_PROJECT_KEY, key),
  getJiraEpics: (projectKey: string): Promise<JiraEpic[]> =>
    ipcRenderer.invoke(IPC.JIRA_GET_EPICS, projectKey),
  getJiraStoriesByEpic: (epicKey: string): Promise<JiraStory[]> =>
    ipcRenderer.invoke(IPC.JIRA_GET_STORIES_BY_EPIC, epicKey),
  getJiraIssue: (issueKey: string): Promise<JiraStory | null> =>
    ipcRenderer.invoke(IPC.JIRA_GET_ISSUE, issueKey),
  refreshJiraEpics: (projectKey: string): Promise<JiraEpic[]> =>
    ipcRenderer.invoke(IPC.JIRA_REFRESH_EPICS, projectKey),
  refreshJiraStories: (epicKey: string): Promise<JiraStory[]> =>
    ipcRenderer.invoke(IPC.JIRA_REFRESH_STORIES, epicKey),
  addJiraComment: (issueKey: string, adfBody: unknown): Promise<boolean> =>
    ipcRenderer.invoke(IPC.JIRA_ADD_COMMENT, issueKey, adfBody),
  transitionJiraIssue: (issueKey: string, transitionId: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.JIRA_TRANSITION_ISSUE, issueKey, transitionId),
  getJiraTransitions: (issueKey: string): Promise<JiraTransition[]> =>
    ipcRenderer.invoke(IPC.JIRA_GET_TRANSITIONS, issueKey),
  clearJiraCredentials: (): Promise<void> =>
    ipcRenderer.invoke(IPC.JIRA_CLEAR_CREDENTIALS)
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api

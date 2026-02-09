import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { IPC } from '@shared/ipc-channels'
import { configLoader } from '../config'
import { configGenerator } from '../config/generator'
import { processManager } from '../process-manager'
import { agentProcessManager } from '../agent-manager'
import { githubManager } from '../github-manager'
import { sessionUsageManager } from '../session-usage-manager'
import { appStore } from '../store'
import { getProjectDocs } from '../docs/project-docs-provider'
import * as adhocProcess from '../docs/adhoc-process'
import { jiraManager } from '../jira-manager'
import type { AppSettings, RecentProject } from '@shared/types'
import type { CreateAgentRequest } from '@shared/agent-types'
import type { JiraCredentials } from '@shared/jira-types'

export function registerIpcHandlers(): void {
  // ── Dialog ──────────────────────────────────────────
  ipcMain.handle(IPC.DIALOG_OPEN_FILES, async (event, defaultPath?: string) => {
    const window = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow()
    if (!window) return null

    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile', 'multiSelections'],
      title: 'Select Context Files',
      defaultPath: defaultPath || undefined
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths
  })

  // ── Project ──────────────────────────────────────────
  ipcMain.handle(IPC.PROJECT_OPEN, async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return null

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
      title: 'Open Project Directory'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle(IPC.PROJECT_OPEN_RECENT, async (_event, projectPath: string) => {
    const config = await configLoader.load(projectPath)
    processManager.setConfigs(config.services)
    addRecentProject(projectPath, config.project.name)
    startConfigWatcher(projectPath)
    return config
  })

  // ── Config ──────────────────────────────────────────
  ipcMain.handle(IPC.CONFIG_LOAD, async (_event, projectPath: string) => {
    const config = await configLoader.load(projectPath)
    processManager.setConfigs(config.services)
    addRecentProject(projectPath, config.project.name)
    startConfigWatcher(projectPath)
    return config
  })

  // ── Config generation ──────────────────────────────────
  ipcMain.handle(IPC.CONFIG_GENERATE, (_event, projectPath: string) => {
    return configGenerator.generate(projectPath)
  })

  ipcMain.handle(IPC.CONFIG_SAVE, (_event, projectPath: string, yamlContent: string) => {
    const filePath = join(projectPath, '.terminal-wrangler.yml')
    writeFileSync(filePath, yamlContent, 'utf-8')
  })

  // ── Process management ──────────────────────────────
  ipcMain.handle(IPC.PROCESS_START, async (_event, serviceId: string) => {
    await processManager.startService(serviceId)
  })

  ipcMain.handle(IPC.PROCESS_STOP, async (_event, serviceId: string) => {
    await processManager.stopService(serviceId)
  })

  ipcMain.handle(IPC.PROCESS_RESTART, async (_event, serviceId: string) => {
    await processManager.restartService(serviceId)
  })

  ipcMain.handle(IPC.PROCESS_START_ALL, async () => {
    await processManager.startAll()
  })

  ipcMain.handle(IPC.PROCESS_STOP_ALL, async () => {
    await processManager.stopAll()
  })

  // ── Terminal ──────────────────────────────────────────
  ipcMain.on(IPC.TERMINAL_INPUT, (_event, { serviceId, data }: { serviceId: string; data: string }) => {
    processManager.writeInput(serviceId, data)
  })

  ipcMain.on(IPC.TERMINAL_RESIZE, (_event, { serviceId, cols, rows }: { serviceId: string; cols: number; rows: number }) => {
    processManager.resizeTerminal(serviceId, cols, rows)
  })

  ipcMain.handle(IPC.TERMINAL_GET_BUFFER, (_event, serviceId: string) => {
    return processManager.getBuffer(serviceId)
  })

  // ── Docs panel ──────────────────────────────────────────
  ipcMain.handle(IPC.DOCS_GET_PROJECT_DOCS, (_event, projectPath: string) => {
    return getProjectDocs(projectPath)
  })

  ipcMain.handle(
    IPC.DOCS_RUN_COMMAND,
    async (_event, commandId: string, command: string, cwd: string, projectPath: string) => {
      await adhocProcess.runCommand(commandId, command, cwd, projectPath)
    }
  )

  ipcMain.handle(IPC.DOCS_COMMAND_STOP, async (_event, commandId: string) => {
    await adhocProcess.stopCommand(commandId)
  })

  ipcMain.on(
    IPC.DOCS_COMMAND_INPUT,
    (_event, { commandId, data }: { commandId: string; data: string }) => {
      adhocProcess.writeInput(commandId, data)
    }
  )

  ipcMain.on(
    IPC.DOCS_COMMAND_RESIZE,
    (_event, { commandId, cols, rows }: { commandId: string; cols: number; rows: number }) => {
      adhocProcess.resize(commandId, cols, rows)
    }
  )

  ipcMain.handle(IPC.DOCS_COMMAND_GET_BUFFER, (_event, commandId: string) => {
    return adhocProcess.getBuffer(commandId)
  })

  // ── Agent management ──────────────────────────────────
  ipcMain.handle(IPC.AGENT_CREATE, async (_event, request: CreateAgentRequest) => {
    return agentProcessManager.createAgent(request)
  })

  ipcMain.handle(IPC.AGENT_STOP, async (_event, agentId: string) => {
    await agentProcessManager.stopAgent(agentId)
  })

  ipcMain.handle(IPC.AGENT_REMOVE, async (_event, agentId: string) => {
    await agentProcessManager.removeAgent(agentId)
  })

  ipcMain.handle(IPC.AGENT_STOP_ALL, async () => {
    await agentProcessManager.stopAll()
  })

  ipcMain.handle(IPC.AGENT_GET_ALL, () => {
    return agentProcessManager.getAllAgents()
  })

  ipcMain.handle(IPC.AGENT_GET_STATE, (_event, agentId: string) => {
    return agentProcessManager.getAgentState(agentId)
  })

  ipcMain.handle(IPC.AGENT_MARK_DONE, (_event, agentId: string) => {
    agentProcessManager.updateAgentStatus(agentId, 'done')
  })

  // ── Agent terminal ──────────────────────────────────
  ipcMain.on(
    IPC.AGENT_TERMINAL_INPUT,
    (_event, { agentId, data }: { agentId: string; data: string }) => {
      agentProcessManager.writeInput(agentId, data)
    }
  )

  ipcMain.on(
    IPC.AGENT_TERMINAL_RESIZE,
    (_event, { agentId, cols, rows }: { agentId: string; cols: number; rows: number }) => {
      agentProcessManager.resizeTerminal(agentId, cols, rows)
    }
  )

  ipcMain.handle(IPC.AGENT_TERMINAL_GET_BUFFER, (_event, agentId: string) => {
    return agentProcessManager.getBuffer(agentId)
  })

  ipcMain.handle(IPC.AGENT_GET_PLAN_CONTENT, (_event, agentId: string) => {
    return agentProcessManager.getPlanContent(agentId)
  })

  ipcMain.handle(IPC.AGENT_SAVE_PLAN, (_event, agentId: string) => {
    return agentProcessManager.savePlan(agentId)
  })

  // ── GitHub integration ──────────────────────────────
  ipcMain.handle(IPC.GITHUB_GET_AUTH_STATUS, async () => {
    return githubManager.getAuthStatus()
  })

  ipcMain.handle(IPC.GITHUB_GET_REMOTE, async (_event, cwd: string) => {
    return githubManager.getRemote(cwd)
  })

  ipcMain.handle(IPC.GITHUB_GET_PR_INFO, async (_event, prUrl: string) => {
    return githubManager.getPrInfo(prUrl)
  })

  ipcMain.handle(IPC.GITHUB_LIST_PRS, async (_event, cwd: string) => {
    return githubManager.listPrs(cwd)
  })

  ipcMain.handle(IPC.GITHUB_GET_PROJECT_STATUS, async (_event, cwd: string) => {
    return githubManager.getProjectStatus(cwd)
  })

  ipcMain.handle(IPC.GITHUB_APPROVE_PR, async (_event, prUrl: string, agentId: string) => {
    try {
      const agent = agentProcessManager.getAgentState(agentId)
      const cwd = agent?.cwd
      return await githubManager.approvePr(prUrl, cwd)
    } catch (err) {
      console.error('Error approving PR:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC.GITHUB_DECLINE_PR, async (_event, prUrl: string, agentId: string) => {
    try {
      const agent = agentProcessManager.getAgentState(agentId)
      const cwd = agent?.cwd
      return await githubManager.declinePr(prUrl, cwd)
    } catch (err) {
      console.error('Error declining PR:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC.GITHUB_GET_PR_DIFF, async (_event, prUrl: string) => {
    return githubManager.getPrDiff(prUrl)
  })

  // ── Session usage ──────────────────────────────────────
  ipcMain.handle(IPC.SESSION_USAGE_GET, async () => {
    return sessionUsageManager.getUsage()
  })

  ipcMain.handle(IPC.SESSION_USAGE_REFRESH, async () => {
    return sessionUsageManager.refresh()
  })

  ipcMain.handle(IPC.SESSION_USAGE_SET_API_KEY, async (_event, apiKey: string | null) => {
    if (apiKey) {
      appStore.set('anthropicApiKey', apiKey)
    } else {
      appStore.delete('anthropicApiKey' as keyof AppSettings)
    }
    return sessionUsageManager.refresh()
  })

  // ── App settings ──────────────────────────────────────
  ipcMain.handle(IPC.APP_GET_SETTINGS, () => {
    return {
      recentProjects: appStore.get('recentProjects', []),
      windowBounds: appStore.get('windowBounds'),
      terminalPanelHeight: appStore.get('terminalPanelHeight', 300),
      sidebarWidth: appStore.get('sidebarWidth', 320),
      docsPanelWidth: appStore.get('docsPanelWidth', 320)
    } as AppSettings
  })

  ipcMain.handle(IPC.APP_SAVE_SETTINGS, (_event, settings: Partial<AppSettings>) => {
    for (const [key, value] of Object.entries(settings)) {
      appStore.set(key as keyof AppSettings, value)
    }
  })

  ipcMain.handle(IPC.APP_GET_RECENT_PROJECTS, () => {
    return appStore.get('recentProjects', [])
  })

  // ── Jira integration ──────────────────────────────────
  ipcMain.handle(IPC.JIRA_GET_CREDENTIALS, () => {
    return jiraManager.getCredentials()
  })

  ipcMain.handle(IPC.JIRA_SET_CREDENTIALS, (_event, creds: JiraCredentials) => {
    jiraManager.setCredentials(creds)
  })

  ipcMain.handle(IPC.JIRA_TEST_CONNECTION, async (_event, creds: JiraCredentials) => {
    return jiraManager.testConnection(creds)
  })

  ipcMain.handle(IPC.JIRA_GET_PROJECT_KEY, () => {
    return jiraManager.getProjectKey()
  })

  ipcMain.handle(IPC.JIRA_SET_PROJECT_KEY, (_event, key: string) => {
    jiraManager.setProjectKey(key)
  })

  ipcMain.handle(IPC.JIRA_GET_EPICS, async (_event, projectKey: string) => {
    return jiraManager.getEpics(projectKey)
  })

  ipcMain.handle(IPC.JIRA_GET_STORIES_BY_EPIC, async (_event, epicKey: string) => {
    return jiraManager.getStoriesByEpic(epicKey)
  })

  ipcMain.handle(IPC.JIRA_GET_ISSUE, async (_event, issueKey: string) => {
    return jiraManager.getIssue(issueKey)
  })

  ipcMain.handle(IPC.JIRA_REFRESH_EPICS, async (_event, projectKey: string) => {
    return jiraManager.refreshEpics(projectKey)
  })

  ipcMain.handle(IPC.JIRA_REFRESH_STORIES, async (_event, epicKey: string) => {
    return jiraManager.refreshStoriesByEpic(epicKey)
  })

  ipcMain.handle(IPC.JIRA_ADD_COMMENT, async (_event, issueKey: string, adfBody: unknown) => {
    return jiraManager.addComment(issueKey, adfBody)
  })

  ipcMain.handle(IPC.JIRA_TRANSITION_ISSUE, async (_event, issueKey: string, transitionId: string) => {
    return jiraManager.transitionIssue(issueKey, transitionId)
  })

  ipcMain.handle(IPC.JIRA_GET_TRANSITIONS, async (_event, issueKey: string) => {
    return jiraManager.getTransitions(issueKey)
  })

  ipcMain.handle(IPC.JIRA_CLEAR_CREDENTIALS, () => {
    jiraManager.clearCredentials()
  })

  // Wire up GitHubManager → AgentProcessManager auto-transition on PR merge
  githubManager.onPrMerged = (agentId) => {
    agentProcessManager.updateAgentStatus(agentId, 'done')
  }

  // Wire up AgentProcessManager → JiraManager lifecycle callbacks
  agentProcessManager.onJiraStatusUpdate = (agentId, issueKey, status) => {
    jiraManager.postLifecycleComment(issueKey, status)
    if (status === 'building') jiraManager.tryTransition(issueKey, 'In Progress')
    if (status === 'done') jiraManager.tryTransition(issueKey, 'Done')
  }

  agentProcessManager.onJiraPrDetected = (issueKey, prUrl) => {
    jiraManager.postLifecycleComment(issueKey, 'pr', prUrl)
  }
}

function startConfigWatcher(projectPath: string): void {
  const window = BrowserWindow.getFocusedWindow()
  if (!window) return

  configLoader.watch(
    projectPath,
    (updatedConfig) => {
      processManager.setConfigs(updatedConfig.services)
      window.webContents.send(IPC.CONFIG_CHANGED, updatedConfig)
    },
    (error) => {
      window.webContents.send(IPC.CONFIG_ERROR, error.message)
    }
  )
}

function addRecentProject(path: string, name: string): void {
  const recent = appStore.get('recentProjects', []) as RecentProject[]
  const filtered = recent.filter((p) => p.path !== path)
  filtered.unshift({ path, name, lastOpened: Date.now() })
  appStore.set('recentProjects', filtered.slice(0, 10))
}

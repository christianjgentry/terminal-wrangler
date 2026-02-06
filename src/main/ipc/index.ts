import { dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { IPC } from '@shared/ipc-channels'
import { handleWithLogging, onWithLogging } from './ipc-logger'
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
import { standardsManager } from '../standards-manager'
import { discoveryManager } from '../discovery-manager'
import { createLogger } from '../lib/logger'
import type { AppSettings, RecentProject } from '@shared/types'
import type { CreateAgentRequest } from '@shared/agent-types'
import type { JiraCredentials } from '@shared/jira-types'
import type { PlanToJiraRequest } from '@shared/planner-types'
import type { AddFileArtifactRequest, AddLinkArtifactRequest } from '@shared/discovery-types'

const rendererLogger = createLogger('R:Renderer')

export function registerIpcHandlers(): void {
  // ── Renderer log forwarding ──────────────────────────
  onWithLogging(
    IPC.LOG_FROM_RENDERER,
    (_event, payload: { level: string; module: string; args: unknown[] }) => {
      const { level, module, args } = payload
      const logger = createLogger(module)
      const fn = logger[level as keyof typeof logger]
      if (typeof fn === 'function') {
        fn(...args)
      } else {
        rendererLogger.info(...args)
      }
    }
  )

  // ── Dialog ──────────────────────────────────────────
  handleWithLogging(IPC.DIALOG_OPEN_FILES, async (event, defaultPath?: string) => {
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
  handleWithLogging(IPC.PROJECT_OPEN, async () => {
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

  handleWithLogging(IPC.PROJECT_OPEN_RECENT, async (_event, projectPath: string) => {
    const config = await configLoader.load(projectPath)
    processManager.setConfigs(config.services)
    addRecentProject(projectPath, config.project.name)
    startConfigWatcher(projectPath)
    return config
  })

  // ── Config ──────────────────────────────────────────
  handleWithLogging(IPC.CONFIG_LOAD, async (_event, projectPath: string) => {
    const config = await configLoader.load(projectPath)
    processManager.setConfigs(config.services)
    addRecentProject(projectPath, config.project.name)
    startConfigWatcher(projectPath)
    return config
  })

  // ── Config generation ──────────────────────────────────
  handleWithLogging(IPC.CONFIG_GENERATE, (_event, projectPath: string) => {
    return configGenerator.generate(projectPath)
  })

  handleWithLogging(IPC.CONFIG_SAVE, (_event, projectPath: string, yamlContent: string) => {
    const filePath = join(projectPath, '.terminal-wrangler.yml')
    writeFileSync(filePath, yamlContent, 'utf-8')
  })

  // ── Process management ──────────────────────────────
  handleWithLogging(IPC.PROCESS_START, async (_event, serviceId: string) => {
    await processManager.startService(serviceId)
  })

  handleWithLogging(IPC.PROCESS_STOP, async (_event, serviceId: string) => {
    await processManager.stopService(serviceId)
  })

  handleWithLogging(IPC.PROCESS_RESTART, async (_event, serviceId: string) => {
    await processManager.restartService(serviceId)
  })

  handleWithLogging(IPC.PROCESS_START_ALL, async () => {
    await processManager.startAll()
  })

  handleWithLogging(IPC.PROCESS_STOP_ALL, async () => {
    await processManager.stopAll()
  })

  // ── Terminal ──────────────────────────────────────────
  onWithLogging(IPC.TERMINAL_INPUT, (_event, { serviceId, data }: { serviceId: string; data: string }) => {
    processManager.writeInput(serviceId, data)
  })

  onWithLogging(IPC.TERMINAL_RESIZE, (_event, { serviceId, cols, rows }: { serviceId: string; cols: number; rows: number }) => {
    processManager.resizeTerminal(serviceId, cols, rows)
  })

  handleWithLogging(IPC.TERMINAL_GET_BUFFER, (_event, serviceId: string) => {
    return processManager.getBuffer(serviceId)
  })

  // ── Docs panel ──────────────────────────────────────────
  handleWithLogging(IPC.DOCS_GET_PROJECT_DOCS, (_event, projectPath: string) => {
    return getProjectDocs(projectPath)
  })

  handleWithLogging(
    IPC.DOCS_RUN_COMMAND,
    async (_event, commandId: string, command: string, cwd: string, projectPath: string) => {
      await adhocProcess.runCommand(commandId, command, cwd, projectPath)
    }
  )

  handleWithLogging(IPC.DOCS_COMMAND_STOP, async (_event, commandId: string) => {
    await adhocProcess.stopCommand(commandId)
  })

  onWithLogging(
    IPC.DOCS_COMMAND_INPUT,
    (_event, { commandId, data }: { commandId: string; data: string }) => {
      adhocProcess.writeInput(commandId, data)
    }
  )

  onWithLogging(
    IPC.DOCS_COMMAND_RESIZE,
    (_event, { commandId, cols, rows }: { commandId: string; cols: number; rows: number }) => {
      adhocProcess.resize(commandId, cols, rows)
    }
  )

  handleWithLogging(IPC.DOCS_COMMAND_GET_BUFFER, (_event, commandId: string) => {
    return adhocProcess.getBuffer(commandId)
  })

  // ── Agent management ──────────────────────────────────
  handleWithLogging(IPC.AGENT_CREATE, async (_event, request: CreateAgentRequest) => {
    return agentProcessManager.createAgent(request)
  })

  handleWithLogging(IPC.AGENT_STOP, async (_event, agentId: string) => {
    await agentProcessManager.stopAgent(agentId)
  })

  handleWithLogging(IPC.AGENT_REMOVE, async (_event, agentId: string) => {
    await agentProcessManager.removeAgent(agentId)
  })

  handleWithLogging(IPC.AGENT_STOP_ALL, async () => {
    await agentProcessManager.stopAll()
  })

  handleWithLogging(IPC.AGENT_GET_ALL, () => {
    return agentProcessManager.getAllAgents()
  })

  handleWithLogging(IPC.AGENT_GET_STATE, (_event, agentId: string) => {
    return agentProcessManager.getAgentState(agentId)
  })

  handleWithLogging(IPC.AGENT_MARK_DONE, (_event, agentId: string) => {
    agentProcessManager.updateAgentStatus(agentId, 'done')
  })

  // ── Agent terminal ──────────────────────────────────
  onWithLogging(
    IPC.AGENT_TERMINAL_INPUT,
    (_event, { agentId, data }: { agentId: string; data: string }) => {
      agentProcessManager.writeInput(agentId, data)
    }
  )

  onWithLogging(
    IPC.AGENT_TERMINAL_RESIZE,
    (_event, { agentId, cols, rows }: { agentId: string; cols: number; rows: number }) => {
      agentProcessManager.resizeTerminal(agentId, cols, rows)
    }
  )

  handleWithLogging(IPC.AGENT_TERMINAL_GET_BUFFER, (_event, agentId: string) => {
    return agentProcessManager.getBuffer(agentId)
  })

  handleWithLogging(IPC.AGENT_GET_PLAN_CONTENT, (_event, agentId: string) => {
    return agentProcessManager.getPlanContent(agentId)
  })

  handleWithLogging(IPC.AGENT_SAVE_PLAN, (_event, agentId: string) => {
    return agentProcessManager.savePlan(agentId)
  })

  // ── GitHub integration ──────────────────────────────
  handleWithLogging(IPC.GITHUB_GET_AUTH_STATUS, async () => {
    return githubManager.getAuthStatus()
  })

  handleWithLogging(IPC.GITHUB_GET_REMOTE, async (_event, cwd: string) => {
    return githubManager.getRemote(cwd)
  })

  handleWithLogging(IPC.GITHUB_GET_PR_INFO, async (_event, prUrl: string) => {
    return githubManager.getPrInfo(prUrl)
  })

  handleWithLogging(IPC.GITHUB_LIST_PRS, async (_event, cwd: string) => {
    return githubManager.listPrs(cwd)
  })

  handleWithLogging(IPC.GITHUB_GET_PROJECT_STATUS, async (_event, cwd: string) => {
    return githubManager.getProjectStatus(cwd)
  })

  handleWithLogging(IPC.GITHUB_MERGE_PR, async (_event, prUrl: string) => {
    return githubManager.mergePr(prUrl)
  })

  handleWithLogging(IPC.GITHUB_GET_PR_DIFF, async (_event, prUrl: string) => {
    return githubManager.getPrDiff(prUrl)
  })

  // ── Session usage ──────────────────────────────────────
  handleWithLogging(IPC.SESSION_USAGE_GET, async () => {
    return sessionUsageManager.getUsage()
  })

  handleWithLogging(IPC.SESSION_USAGE_REFRESH, async () => {
    return sessionUsageManager.refresh()
  })

  // ── App settings ──────────────────────────────────────
  handleWithLogging(IPC.APP_GET_SETTINGS, () => {
    return {
      recentProjects: appStore.get('recentProjects', []),
      windowBounds: appStore.get('windowBounds'),
      terminalPanelHeight: appStore.get('terminalPanelHeight', 300),
      sidebarWidth: appStore.get('sidebarWidth', 320),
      docsPanelWidth: appStore.get('docsPanelWidth', 320)
    } as AppSettings
  })

  handleWithLogging(IPC.APP_SAVE_SETTINGS, (_event, settings: Partial<AppSettings>) => {
    for (const [key, value] of Object.entries(settings)) {
      appStore.set(key as keyof AppSettings, value)
    }
  })

  handleWithLogging(IPC.APP_GET_RECENT_PROJECTS, () => {
    return appStore.get('recentProjects', [])
  })

  // ── Jira integration ──────────────────────────────────
  handleWithLogging(IPC.JIRA_GET_CREDENTIALS, () => {
    return jiraManager.getCredentials()
  })

  handleWithLogging(IPC.JIRA_SET_CREDENTIALS, (_event, creds: JiraCredentials) => {
    jiraManager.setCredentials(creds)
  })

  handleWithLogging(IPC.JIRA_TEST_CONNECTION, async (_event, creds: JiraCredentials) => {
    return jiraManager.testConnection(creds)
  })

  handleWithLogging(IPC.JIRA_GET_PROJECT_KEY, () => {
    return jiraManager.getProjectKey()
  })

  handleWithLogging(IPC.JIRA_SET_PROJECT_KEY, (_event, key: string) => {
    jiraManager.setProjectKey(key)
  })

  handleWithLogging(IPC.JIRA_GET_EPICS, async (_event, projectKey: string) => {
    return jiraManager.getEpics(projectKey)
  })

  handleWithLogging(IPC.JIRA_GET_STORIES_BY_EPIC, async (_event, epicKey: string) => {
    return jiraManager.getStoriesByEpic(epicKey)
  })

  handleWithLogging(IPC.JIRA_GET_ISSUE, async (_event, issueKey: string) => {
    return jiraManager.getIssue(issueKey)
  })

  handleWithLogging(IPC.JIRA_REFRESH_EPICS, async (_event, projectKey: string) => {
    return jiraManager.refreshEpics(projectKey)
  })

  handleWithLogging(IPC.JIRA_REFRESH_STORIES, async (_event, epicKey: string) => {
    return jiraManager.refreshStoriesByEpic(epicKey)
  })

  handleWithLogging(IPC.JIRA_ADD_COMMENT, async (_event, issueKey: string, adfBody: unknown) => {
    return jiraManager.addComment(issueKey, adfBody)
  })

  handleWithLogging(IPC.JIRA_TRANSITION_ISSUE, async (_event, issueKey: string, transitionId: string) => {
    return jiraManager.transitionIssue(issueKey, transitionId)
  })

  handleWithLogging(IPC.JIRA_GET_TRANSITIONS, async (_event, issueKey: string) => {
    return jiraManager.getTransitions(issueKey)
  })

  handleWithLogging(IPC.JIRA_CLEAR_CREDENTIALS, () => {
    jiraManager.clearCredentials()
  })

  // ── Standards / Planner ──────────────────────────────
  handleWithLogging(IPC.STANDARDS_GET_DIR, () => {
    return standardsManager.getStandardsDir()
  })

  handleWithLogging(IPC.STANDARDS_SET_DIR, (_event, dir: string) => {
    standardsManager.setStandardsDir(dir)
  })

  handleWithLogging(IPC.STANDARDS_LIST_FILES, async () => {
    return standardsManager.listFiles()
  })

  handleWithLogging(IPC.STANDARDS_READ_FILE, async (_event, relativePath: string) => {
    return standardsManager.readFile(relativePath)
  })

  handleWithLogging(IPC.STANDARDS_WRITE_FILE, async (_event, relativePath: string, content: string) => {
    await standardsManager.writeFile(relativePath, content)
  })

  // ── Discovery ──────────────────────────────────────
  handleWithLogging(IPC.DISCOVERY_INIT, async (_event, projectPath: string) => {
    await discoveryManager.initDiscoveryFolder(projectPath)
  })

  handleWithLogging(IPC.DISCOVERY_EXISTS, async (_event, projectPath: string) => {
    return discoveryManager.exists(projectPath)
  })

  handleWithLogging(IPC.DISCOVERY_LIST, async (_event, projectPath: string) => {
    return discoveryManager.listArtifacts(projectPath)
  })

  handleWithLogging(IPC.DISCOVERY_ADD_FILES, async (_event, projectPath: string, request: AddFileArtifactRequest) => {
    return discoveryManager.addFileArtifacts(projectPath, request)
  })

  handleWithLogging(IPC.DISCOVERY_ADD_LINK, async (_event, projectPath: string, request: AddLinkArtifactRequest) => {
    return discoveryManager.addLink(projectPath, request)
  })

  handleWithLogging(IPC.DISCOVERY_REMOVE, async (_event, projectPath: string, id: string) => {
    await discoveryManager.removeArtifact(projectPath, id)
  })

  handleWithLogging(IPC.DISCOVERY_BUILD_CONTEXT, async (_event, projectPath: string, artifactIds?: string[]) => {
    return discoveryManager.buildContext(projectPath, artifactIds)
  })

  handleWithLogging(IPC.PLANNER_SPAWN_AGENT, async (_event, request: PlanToJiraRequest) => {
    const skillPrompt = await standardsManager.getSkillPrompt()
    const filePaths = await standardsManager.getAbsolutePaths()

    let taskPrompt = skillPrompt + '\n\nFeature to implement:\n' + request.featureDescription
    if (request.projectKey) {
      taskPrompt += `\n\nJira Project Key: ${request.projectKey}`
    }
    if (request.includeConfluence) {
      taskPrompt += '\n\nInclude Confluence documentation pages for the epics/stories.'
    }

    // Merge discovery context if enabled
    if (request.includeDiscovery && request.projectPath) {
      const ctx = await discoveryManager.buildContext(request.projectPath)
      if (ctx.filePaths.length > 0) {
        filePaths.push(...ctx.filePaths)
      }
      if (ctx.linkPromptText) {
        taskPrompt += ctx.linkPromptText
      }
    }

    const agentName = 'Jira Planner: ' + request.featureDescription.slice(0, 50)
    return agentProcessManager.createAgent({
      name: agentName,
      task: taskPrompt,
      cwd: process.env.HOME || '/tmp',
      files: filePaths.length > 0 ? filePaths : undefined
    })
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

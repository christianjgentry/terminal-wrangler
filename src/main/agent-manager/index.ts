import { BrowserWindow, dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { IPC } from '@shared/ipc-channels'
import type { AgentStatus, AgentInfo, AgentTask, SubagentInfo, CreateAgentRequest } from '@shared/agent-types'
import type { AgentProcessEvents } from './types'
import { AgentProcess } from './agent-process'
import { githubManager } from '../github-manager'
import { detectGitRemote } from '../github-manager/git-remote'
import { createBranchFromMain } from '../github-manager/git-branch'
import { generateBranchName } from '@shared/branch-utils'
import { getJiraCredentials } from '../jira-manager/credentials'

let agentCounter = 0

function generateAgentId(): string {
  agentCounter++
  return `agent-${Date.now()}-${agentCounter}`
}

export class AgentProcessManager {
  private agents = new Map<string, AgentProcess>()
  private agentInfos = new Map<string, AgentInfo>()

  // Jira lifecycle callbacks (wired from ipc/index.ts)
  onJiraStatusUpdate?: (agentId: string, issueKey: string, status: AgentStatus) => void
  onJiraPrDetected?: (issueKey: string, prUrl: string) => void

  async createAgent(request: CreateAgentRequest): Promise<AgentInfo> {
    const id = generateAgentId()

    const events: AgentProcessEvents = {
      onStatusChange: (agentId, status) => {
        const info = this.agentInfos.get(agentId)
        if (info) {
          info.status = status
          this.broadcast(IPC.AGENT_STATUS_CHANGED, { agentId, status })
          if (info.jiraIssueKey && this.onJiraStatusUpdate) {
            this.onJiraStatusUpdate(agentId, info.jiraIssueKey, status)
          }
        }
      },
      onData: (agentId, data) => {
        this.broadcast(IPC.AGENT_TERMINAL_DATA, { agentId, data })
      },
      onExit: (agentId, exitCode) => {
        const info = this.agentInfos.get(agentId)
        if (info) {
          info.processAlive = false
        }
        this.broadcast(IPC.AGENT_EXIT, { agentId, exitCode })
      },
      onSubagentDetected: (agentId, taskDescription) => {
        const parentInfo = this.agentInfos.get(agentId)
        if (!parentInfo) return

        const subId = generateAgentId()
        const subagent: SubagentInfo = {
          id: subId,
          parentAgentId: agentId,
          taskDescription,
          status: 'planning',
          detectedAt: Date.now()
        }
        parentInfo.subagents.push(subagent)

        // Also create a top-level AgentInfo for the subagent so it shows in the board
        const subagentInfo: AgentInfo = {
          id: subId,
          name: `${parentInfo.name} > subtask`,
          task: taskDescription,
          cwd: parentInfo.cwd,
          status: 'planning',
          createdAt: Date.now(),
          parentAgentId: agentId,
          subagents: []
        }
        this.agentInfos.set(subId, subagentInfo)

        this.broadcast(IPC.AGENT_SUBAGENT_DETECTED, {
          agentId,
          subagent: subagentInfo
        })
      },
      onPrDetected: (agentId, prUrl) => {
        const info = this.agentInfos.get(agentId)
        if (info) {
          info.detectedPrUrl = prUrl
          this.broadcast(IPC.AGENT_PR_DETECTED, { agentId, prUrl })
          githubManager.startPolling(agentId, prUrl)
          if (info.jiraIssueKey && this.onJiraPrDetected) {
            this.onJiraPrDetected(info.jiraIssueKey, prUrl)
          }
        }
      },
      onContextUsageChanged: (agentId, used, max) => {
        const info = this.agentInfos.get(agentId)
        if (info) {
          info.contextUsage = { used, max }
          this.broadcast(IPC.AGENT_CONTEXT_USAGE, { agentId, used, max })
        }
      },
      onTasksChanged: (agentId, tasks) => {
        const info = this.agentInfos.get(agentId)
        if (info) {
          info.tasks = tasks
          this.broadcast(IPC.AGENT_TASKS_CHANGED, { agentId, tasks })
        }
      },
      onPlanDetected: (agentId, planFilePath) => {
        const info = this.agentInfos.get(agentId)
        if (info) {
          info.planFilePath = planFilePath
          this.broadcast(IPC.AGENT_PLAN_DETECTED, { agentId, planFilePath })
        }
      },
      onInputNeeded: (agentId, prompt) => {
        const info = this.agentInfos.get(agentId)
        if (info) {
          this.broadcast(IPC.AGENT_INPUT_NEEDED, { agentId, agentName: info.name, prompt })
        }
      },
      onCommitQuestionDetected: (agentId) => {
        const info = this.agentInfos.get(agentId)
        // Only trigger for no-branch mode (when branch is not set)
        if (info && !info.branch) {
          info.awaitingCommitResponse = true
          info.status = 'pr_ready'
          this.broadcast(IPC.AGENT_STATUS_CHANGED, { agentId, status: 'pr_ready' })
          this.broadcast(IPC.AGENT_COMMIT_QUESTION, { agentId, agentName: info.name })
        }
      }
    }

    // Determine branch first so we can pass it to the agent process
    let branch: string | undefined
    if (request.createBranch) {
      const branchName = request.branchName?.trim() || generateBranchName(request.name)
      try {
        await createBranchFromMain(request.cwd, branchName)
        branch = branchName
      } catch (err) {
        throw err
      }
    }

    // Get Jira credentials for context injection
    const jiraCredentials = getJiraCredentials()

    const agentProcess = new AgentProcess(
      {
        id,
        name: request.name,
        task: request.task,
        cwd: request.cwd,
        files: request.files,
        planMode: request.planMode,
        branch,
        jiraIssueKey: request.jiraIssueKey,
        jiraCloudUrl: jiraCredentials?.cloudUrl
      },
      events
    )

    this.agents.set(id, agentProcess)

    const gitRemote = await detectGitRemote(request.cwd).catch(() => null)

    const info: AgentInfo = {
      id,
      name: request.name,
      task: request.task,
      cwd: request.cwd,
      status: 'idle',
      createdAt: Date.now(),
      subagents: [],
      gitRemote: gitRemote ?? undefined,
      files: request.files,
      branch,
      processAlive: true,
      jiraIssueKey: request.jiraIssueKey
    }
    this.agentInfos.set(id, info)

    await agentProcess.start()
    info.pid = agentProcess.pid

    // Fire Jira pickup lifecycle event
    if (info.jiraIssueKey && this.onJiraStatusUpdate) {
      this.onJiraStatusUpdate(id, info.jiraIssueKey, 'idle')
    }

    return info
  }

  async stopAgent(agentId: string): Promise<void> {
    githubManager.stopPolling(agentId)
    const process = this.agents.get(agentId)
    if (process) {
      await process.stop()
    }
  }

  async removeAgent(agentId: string): Promise<void> {
    const info = this.agentInfos.get(agentId)

    // Collect subagent IDs before cleanup
    const subagentIds = info?.subagents.map((s) => s.id) || []

    // If this is a subagent, remove from parent's subagents array
    if (info?.parentAgentId) {
      const parentInfo = this.agentInfos.get(info.parentAgentId)
      if (parentInfo) {
        parentInfo.subagents = parentInfo.subagents.filter((s) => s.id !== agentId)
      }
    }

    // Stop the agent process and GitHub polling
    await this.stopAgent(agentId)

    // Remove from maps
    this.agents.delete(agentId)
    this.agentInfos.delete(agentId)

    // Remove all subagents
    for (const subId of subagentIds) {
      await this.stopAgent(subId)
      this.agents.delete(subId)
      this.agentInfos.delete(subId)
    }
  }

  async stopAll(): Promise<void> {
    await Promise.all(
      Array.from(this.agents.keys()).map((id) => this.stopAgent(id))
    )
  }

  writeInput(agentId: string, data: string): void {
    this.agents.get(agentId)?.write(data)
  }

  resizeTerminal(agentId: string, cols: number, rows: number): void {
    this.agents.get(agentId)?.resize(cols, rows)
  }

  getBuffer(agentId: string): string {
    return this.agents.get(agentId)?.getOutputBuffer() || ''
  }

  getAgentState(agentId: string): AgentInfo | null {
    return this.agentInfos.get(agentId) || null
  }

  getAllAgents(): AgentInfo[] {
    return Array.from(this.agentInfos.values())
  }

  async getPlanContent(agentId: string): Promise<string | null> {
    const info = this.agentInfos.get(agentId)
    if (!info?.planFilePath) return null
    try {
      return await readFile(info.planFilePath, 'utf-8')
    } catch {
      return null
    }
  }

  async savePlan(agentId: string): Promise<boolean> {
    const info = this.agentInfos.get(agentId)
    if (!info?.planFilePath) return false

    let content: string
    try {
      content = await readFile(info.planFilePath, 'utf-8')
    } catch {
      return false
    }

    const window = BrowserWindow.getFocusedWindow()
    if (!window) return false

    const result = await dialog.showSaveDialog(window, {
      title: 'Save Plan',
      defaultPath: `${info.name}-plan.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (result.canceled || !result.filePath) return false

    try {
      await writeFile(result.filePath, content, 'utf-8')
      return true
    } catch {
      return false
    }
  }

  updateAgentStatus(agentId: string, status: AgentStatus): void {
    const info = this.agentInfos.get(agentId)
    if (info) {
      info.status = status
      this.broadcast(IPC.AGENT_STATUS_CHANGED, { agentId, status })
    }
  }

  private broadcast(channel: string, data: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    }
  }
}

export const agentProcessManager = new AgentProcessManager()

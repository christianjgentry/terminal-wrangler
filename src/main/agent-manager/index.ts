import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { AgentStatus, AgentInfo, SubagentInfo, CreateAgentRequest } from '@shared/agent-types'
import type { AgentProcessEvents } from './types'
import { AgentProcess } from './agent-process'

let agentCounter = 0

function generateAgentId(): string {
  agentCounter++
  return `agent-${Date.now()}-${agentCounter}`
}

export class AgentProcessManager {
  private agents = new Map<string, AgentProcess>()
  private agentInfos = new Map<string, AgentInfo>()

  async createAgent(request: CreateAgentRequest): Promise<AgentInfo> {
    const id = generateAgentId()

    const events: AgentProcessEvents = {
      onStatusChange: (agentId, status) => {
        const info = this.agentInfos.get(agentId)
        if (info) {
          info.status = status
          this.broadcast(IPC.AGENT_STATUS_CHANGED, { agentId, status })
        }
      },
      onData: (agentId, data) => {
        this.broadcast(IPC.AGENT_TERMINAL_DATA, { agentId, data })
      },
      onExit: (agentId, exitCode) => {
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
        }
      }
    }

    const agentProcess = new AgentProcess(
      { id, name: request.name, task: request.task, cwd: request.cwd },
      events
    )

    this.agents.set(id, agentProcess)

    const info: AgentInfo = {
      id,
      name: request.name,
      task: request.task,
      cwd: request.cwd,
      status: 'idle',
      createdAt: Date.now(),
      subagents: []
    }
    this.agentInfos.set(id, info)

    await agentProcess.start()
    info.pid = agentProcess.pid

    return info
  }

  async stopAgent(agentId: string): Promise<void> {
    const process = this.agents.get(agentId)
    if (process) {
      await process.stop()
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

  private broadcast(channel: string, data: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    }
  }
}

export const agentProcessManager = new AgentProcessManager()

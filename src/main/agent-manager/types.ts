import type { AgentStatus, AgentTask } from '@shared/agent-types'

export interface AgentProcessEvents {
  onStatusChange: (agentId: string, status: AgentStatus) => void
  onData: (agentId: string, data: string) => void
  onExit: (agentId: string, exitCode: number | null) => void
  onSubagentDetected: (agentId: string, taskDescription: string) => void
  onPrDetected: (agentId: string, prUrl: string) => void
  onContextUsageChanged: (agentId: string, used: number, max: number) => void
  onTasksChanged: (agentId: string, tasks: AgentTask[]) => void
  onPlanDetected: (agentId: string, planFilePath: string) => void
  onInputNeeded: (agentId: string, prompt: string) => void
  onCommitQuestionDetected: (agentId: string) => void
}

export interface AgentConfig {
  id: string
  name: string
  task: string
  cwd: string
  parentAgentId?: string
  files?: string[]
  planMode?: boolean
  branch?: string // Branch name if agent should create a PR when done
  jiraIssueKey?: string // Jira issue key if spawned from Jira
  jiraCloudUrl?: string // Jira cloud URL for MCP context
}

export const OUTPUT_BUFFER_SIZE = 100 * 1024 // 100KB ring buffer

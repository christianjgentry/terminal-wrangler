export type AgentStatus = 'idle' | 'planning' | 'building' | 'pr_ready' | 'done' | 'error' | 'stopped'

export interface SubagentInfo {
  id: string
  parentAgentId: string
  taskDescription: string
  status: AgentStatus
  detectedAt: number
}

export interface AgentInfo {
  id: string
  name: string
  task: string
  cwd: string
  status: AgentStatus
  createdAt: number
  pid?: number
  parentAgentId?: string
  subagents: SubagentInfo[]
  detectedPrUrl?: string
}

export interface CreateAgentRequest {
  name: string
  task: string
  cwd: string
}

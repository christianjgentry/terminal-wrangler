export type AgentStatus = 'idle' | 'planning' | 'building' | 'pr_ready' | 'done' | 'error' | 'stopped'

export interface ContextUsage {
  used: number // in thousands (e.g., 45.2 = 45.2k tokens)
  max: number  // in thousands (e.g., 200 = 200k tokens)
}

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
  prInfo?: import('./github-types').PrInfo
  gitRemote?: import('./github-types').GitRemoteInfo
  files?: string[]
  contextUsage?: ContextUsage
}

export interface CreateAgentRequest {
  name: string
  task: string
  cwd: string
  files?: string[]
}

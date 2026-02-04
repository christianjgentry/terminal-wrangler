import type { AgentStatus } from '@shared/agent-types'

export const agentStatusColors: Record<AgentStatus, string> = {
  idle: '#6b7280',
  planning: '#a855f7',
  building: '#3b82f6',
  pr_ready: '#10b981',
  done: '#10b981',
  error: '#ef4444',
  stopped: '#6b7280'
}

export const agentStatusLabels: Record<AgentStatus, string> = {
  idle: 'Idle',
  planning: 'Planning',
  building: 'Building',
  pr_ready: 'PR Ready',
  done: 'Done',
  error: 'Error',
  stopped: 'Stopped'
}

export const agentStatusBgColors: Record<AgentStatus, string> = {
  idle: 'bg-gray-500/20',
  planning: 'bg-purple-500/20',
  building: 'bg-blue-500/20',
  pr_ready: 'bg-emerald-500/20',
  done: 'bg-emerald-500/20',
  error: 'bg-red-500/20',
  stopped: 'bg-gray-500/20'
}

export interface KanbanColumn {
  status: AgentStatus
  label: string
  color: string
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { status: 'idle', label: 'Idle', color: '#6b7280' },
  { status: 'planning', label: 'Planning', color: '#a855f7' },
  { status: 'building', label: 'Building', color: '#3b82f6' },
  { status: 'pr_ready', label: 'PR Ready', color: '#10b981' },
  { status: 'done', label: 'Done', color: '#10b981' }
]

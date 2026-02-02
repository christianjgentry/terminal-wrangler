import type { ServiceStatus } from '@shared/types'

export const statusColors: Record<ServiceStatus, string> = {
  idle: '#6b7280',
  starting: '#f59e0b',
  running: '#10b981',
  stopping: '#f59e0b',
  stopped: '#6b7280',
  error: '#ef4444',
  crashed: '#dc2626'
}

export const statusLabels: Record<ServiceStatus, string> = {
  idle: 'Idle',
  starting: 'Starting',
  running: 'Running',
  stopping: 'Stopping',
  stopped: 'Stopped',
  error: 'Error',
  crashed: 'Crashed'
}

export const statusBgColors: Record<ServiceStatus, string> = {
  idle: 'bg-gray-500/20',
  starting: 'bg-amber-500/20',
  running: 'bg-emerald-500/20',
  stopping: 'bg-amber-500/20',
  stopped: 'bg-gray-500/20',
  error: 'bg-red-500/20',
  crashed: 'bg-red-600/20'
}

export const statusTextColors: Record<ServiceStatus, string> = {
  idle: 'text-gray-400',
  starting: 'text-amber-400',
  running: 'text-emerald-400',
  stopping: 'text-amber-400',
  stopped: 'text-gray-400',
  error: 'text-red-400',
  crashed: 'text-red-400'
}

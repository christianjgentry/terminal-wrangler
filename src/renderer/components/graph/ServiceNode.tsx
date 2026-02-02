import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ServiceStatus } from '@shared/types'
import { statusColors } from '../../lib/status-colors'
import { StatusBadge } from '../shared/StatusBadge'
import { useAppStore } from '../../stores/app-store'

export interface ServiceNodeData {
  label: string
  serviceId: string
  status: ServiceStatus
  command: string
  tags: string[]
  hasDependencies: boolean
  hasDependents: boolean
  [key: string]: unknown
}

function ServiceNodeComponent({ data, selected }: NodeProps): JSX.Element {
  const nodeData = data as unknown as ServiceNodeData
  const { label, serviceId, status, command, tags, hasDependencies, hasDependents } = nodeData
  const color = statusColors[status]
  const setActiveTerminalTab = useAppStore((s) => s.setActiveTerminalTab)
  const setTerminalPanelOpen = useAppStore((s) => s.setTerminalPanelOpen)

  const isRunning = status === 'running' || status === 'starting'
  const isStopped = status === 'idle' || status === 'stopped'

  const handleStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.api.startService(serviceId)
    },
    [serviceId]
  )

  const handleStop = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.api.stopService(serviceId)
    },
    [serviceId]
  )

  const handleRestart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.api.restartService(serviceId)
    },
    [serviceId]
  )

  const handleOpenTerminal = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setActiveTerminalTab(serviceId)
      setTerminalPanelOpen(true)
    },
    [serviceId, setActiveTerminalTab, setTerminalPanelOpen]
  )

  return (
    <div
      className={`
        relative w-[260px] rounded-xl border transition-all duration-200
        ${selected ? 'border-accent shadow-lg shadow-accent/20' : 'border-white/10 hover:border-white/20'}
        bg-surface-800
      `}
      style={{
        boxShadow: selected ? undefined : `0 0 0 0 ${color}`,
      }}
    >
      {/* Status indicator bar */}
      <div
        className="absolute top-0 left-4 right-4 h-0.5 rounded-b-full"
        style={{ backgroundColor: color }}
      />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{label}</h3>
            <p className="text-[10px] text-surface-400 font-mono truncate mt-0.5">{command}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[9px] bg-white/5 text-surface-400 rounded font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-1 pt-1 border-t border-white/5">
          {isStopped && (
            <button
              onClick={handleStart}
              className="px-2 py-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded transition-colors"
            >
              Start
            </button>
          )}
          {isRunning && (
            <>
              <button
                onClick={handleStop}
                className="px-2 py-1 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
              >
                Stop
              </button>
              <button
                onClick={handleRestart}
                className="px-2 py-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded transition-colors"
              >
                Restart
              </button>
            </>
          )}
          {status === 'error' || status === 'crashed' ? (
            <button
              onClick={handleStart}
              className="px-2 py-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded transition-colors"
            >
              Retry
            </button>
          ) : null}
          <div className="flex-1" />
          <button
            onClick={handleOpenTerminal}
            className="px-2 py-1 text-[10px] font-medium text-surface-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
            title="Open Terminal"
          >
            Terminal
          </button>
        </div>
      </div>

      {/* Handles */}
      {hasDependencies && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2 !h-2 !bg-surface-600 !border-surface-400"
        />
      )}
      {hasDependents && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-surface-600 !border-surface-400"
        />
      )}
    </div>
  )
}

export const ServiceNode = memo(ServiceNodeComponent)

import type { AgentInfo } from '@shared/agent-types'
import { agentStatusColors } from '../../lib/agent-status-colors'
import { AgentStatusBadge } from './AgentStatusBadge'
import { AgentMiniTerminal } from './AgentMiniTerminal'

interface AgentCardProps {
  agent: AgentInfo
  onStop: (agentId: string) => void
  onOpenTerminal: (agentId: string) => void
}

export function AgentCard({ agent, onStop, onOpenTerminal }: AgentCardProps): JSX.Element {
  const color = agentStatusColors[agent.status]
  const isSubagent = !!agent.parentAgentId
  const isActive = agent.status !== 'done' && agent.status !== 'stopped' && agent.status !== 'error'

  const handleOpenTerminal = (): void => {
    // For subagents, open the parent's terminal
    const terminalId = agent.parentAgentId || agent.id
    onOpenTerminal(terminalId)
  }

  return (
    <div
      className="bg-surface-800 rounded-lg border border-white/5 overflow-hidden hover:border-white/10 transition-colors cursor-pointer"
      onClick={handleOpenTerminal}
    >
      {/* Status color bar */}
      <div className="h-0.5" style={{ backgroundColor: color }} />

      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {isSubagent && (
                <span className="text-[9px] text-surface-500 bg-surface-700 px-1 rounded">SUB</span>
              )}
              <span className="text-xs font-medium text-surface-200 truncate">{agent.name}</span>
            </div>
            <p className="text-[10px] text-surface-500 mt-0.5 line-clamp-2">{agent.task}</p>
          </div>
          <AgentStatusBadge status={agent.status} size="sm" />
        </div>

        {/* Mini terminal */}
        {!isSubagent && <AgentMiniTerminal agentId={agent.id} />}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {agent.subagents.length > 0 && (
              <span className="text-[9px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">
                {agent.subagents.length} subtask{agent.subagents.length !== 1 ? 's' : ''}
              </span>
            )}
            {agent.detectedPrUrl && (
              <a
                href={agent.detectedPrUrl}
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(agent.detectedPrUrl, '_blank')
                }}
                className="text-[9px] text-emerald-400 hover:text-emerald-300 truncate max-w-[120px]"
              >
                PR Link
              </a>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleOpenTerminal()
              }}
              className="px-1.5 py-0.5 text-[9px] text-surface-400 hover:text-white bg-surface-700 hover:bg-surface-600 rounded transition-colors"
            >
              Terminal
            </button>
            {isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onStop(agent.id)
                }}
                className="px-1.5 py-0.5 text-[9px] text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

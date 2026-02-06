import { memo } from 'react'
import type { AgentInfo } from '@shared/agent-types'
import type { KanbanColumn as KanbanColumnType } from '../../lib/agent-status-colors'
import { AgentCard } from './AgentCard'

interface KanbanColumnProps {
  column: KanbanColumnType
  agents: AgentInfo[]
  onStopAgent: (agentId: string) => void
  onRemoveAgent: (agentId: string) => void
  onOpenTerminal: (agentId: string) => void
  onRerunAgent: (agentId: string) => void
}

export const KanbanColumn = memo(function KanbanColumn({ column, agents, onStopAgent, onRemoveAgent, onOpenTerminal, onRerunAgent }: KanbanColumnProps): JSX.Element {
  return (
    <div className="flex-1 min-w-[220px] max-w-[320px] flex flex-col">
      {/* Column header */}
      <div className="flex items-center gap-2 px-2 py-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
        <span className="text-xs font-medium text-surface-300">{column.label}</span>
        {agents.length > 0 && (
          <span className="text-[10px] text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded-full ml-auto">
            {agents.length}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 px-1">
        {agents.length > 0 ? (
          agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStop={onStopAgent}
              onRemove={onRemoveAgent}
              onOpenTerminal={onOpenTerminal}
              onRerun={onRerunAgent}
            />
          ))
        ) : (
          <div className="text-center text-[10px] text-surface-600 py-8">No agents</div>
        )}
      </div>
    </div>
  )
})

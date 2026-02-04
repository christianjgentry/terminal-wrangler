import { useState, useCallback, useMemo } from 'react'
import { useAgentStore } from '../../stores/agent-store'
import { useAppStore } from '../../stores/app-store'
import { KANBAN_COLUMNS } from '../../lib/agent-status-colors'
import { KanbanColumn } from './KanbanColumn'
import { AgentCreateDialog } from './AgentCreateDialog'
import { GitHubStatusBar } from './GitHubStatusBar'

export function AgentBoard(): JSX.Element {
  const agents = useAgentStore((s) => s.agents)
  const setActiveAgentTerminalTab = useAppStore((s) => s.setActiveAgentTerminalTab)
  const setAgentTerminalPanelOpen = useAppStore((s) => s.setAgentTerminalPanelOpen)
  const [dialogOpen, setDialogOpen] = useState(false)

  const agentList = useMemo(() => Object.values(agents), [agents])
  const totalCount = agentList.length

  const handleStopAgent = useCallback(async (agentId: string) => {
    await window.api.stopAgent(agentId)
  }, [])

  const handleOpenTerminal = useCallback(
    (agentId: string) => {
      setActiveAgentTerminalTab(agentId)
      setAgentTerminalPanelOpen(true)
    },
    [setActiveAgentTerminalTab, setAgentTerminalPanelOpen]
  )

  // Group agents by status, including stopped/error agents in the appropriate column
  const agentsByColumn = useMemo(() => {
    const grouped: Record<string, typeof agentList> = {}
    for (const col of KANBAN_COLUMNS) {
      grouped[col.status] = []
    }
    // Add error/stopped agents to the 'done' column for visibility
    for (const agent of agentList) {
      if (grouped[agent.status]) {
        grouped[agent.status].push(agent)
      } else if (agent.status === 'error' || agent.status === 'stopped') {
        grouped['done']?.push(agent)
      }
    }
    return grouped
  }, [agentList])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Board header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-surface-300">Agent Board</span>
          {totalCount > 0 && (
            <span className="text-[10px] text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="px-2.5 py-1 text-[10px] font-medium text-accent-light bg-accent/10 hover:bg-accent/20 rounded transition-colors"
        >
          + New Agent
        </button>
      </div>

      {/* GitHub status bar */}
      <GitHubStatusBar />

      {/* Kanban columns */}
      {totalCount > 0 ? (
        <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              column={col}
              agents={agentsByColumn[col.status] || []}
              onStopAgent={handleStopAgent}
              onOpenTerminal={handleOpenTerminal}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-surface-500 text-sm mb-3">No agents running</p>
            <button
              onClick={() => setDialogOpen(true)}
              className="px-4 py-2 text-xs font-medium text-accent-light bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors"
            >
              Create Your First Agent
            </button>
          </div>
        </div>
      )}

      <AgentCreateDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}

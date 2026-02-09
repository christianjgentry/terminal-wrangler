import { useState, useCallback, useMemo } from 'react'
import { useAgentStore } from '../../stores/agent-store'
import { useAgentTerminalStore } from '../../stores/agent-terminal-store'
import { useGithubStore } from '../../stores/github-store'
import { useAppStore } from '../../stores/app-store'
import { KANBAN_COLUMNS } from '../../lib/agent-status-colors'
import { KanbanColumn } from './KanbanColumn'
import { AgentCreateDialog } from './AgentCreateDialog'
import { ConfirmStopDialog } from './ConfirmStopDialog'
import { GitHubStatusBar } from './GitHubStatusBar'
import { disposeAgentTerminal } from './AgentTerminalView'

export function AgentBoard(): JSX.Element {
  const agents = useAgentStore((s) => s.agents)
  const addAgent = useAgentStore((s) => s.addAgent)
  const removeAgentFromStore = useAgentStore((s) => s.removeAgent)
  const clearTerminalBuffer = useAgentTerminalStore((s) => s.clearBuffer)
  const removePrInfo = useGithubStore((s) => s.removePrInfo)
  const activeAgentTerminalTab = useAppStore((s) => s.activeAgentTerminalTab)
  const setActiveAgentTerminalTab = useAppStore((s) => s.setActiveAgentTerminalTab)
  const setAgentTerminalPanelOpen = useAppStore((s) => s.setAgentTerminalPanelOpen)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [stopConfirmAgentId, setStopConfirmAgentId] = useState<string | null>(null)

  const agentList = useMemo(() => Object.values(agents), [agents])
  const totalCount = agentList.length

  const handleStopAgent = useCallback((agentId: string) => {
    setStopConfirmAgentId(agentId)
  }, [])

  const handleConfirmStop = useCallback(() => {
    if (stopConfirmAgentId) {
      // Close dialog immediately, then stop agent and mark as done
      const agentId = stopConfirmAgentId
      setStopConfirmAgentId(null)
      window.api.stopAgent(agentId).then(() => {
        window.api.markAgentDone(agentId)
      })
    }
  }, [stopConfirmAgentId])

  const handleCancelStop = useCallback(() => {
    setStopConfirmAgentId(null)
  }, [])

  const handleOpenTerminal = useCallback(
    (agentId: string) => {
      setActiveAgentTerminalTab(agentId)
      setAgentTerminalPanelOpen(true)
    },
    [setActiveAgentTerminalTab, setAgentTerminalPanelOpen]
  )

  const handleRemoveAgent = useCallback(
    async (agentId: string) => {
      const agent = agents[agentId]
      const subagentIds = agent?.subagents.map((s) => s.id) || []
      const allIds = [agentId, ...subagentIds]

      // Backend cleanup (stops process, GitHub polling, removes from maps)
      await window.api.removeAgent(agentId)

      // Frontend cleanup for agent and all subagents
      for (const id of allIds) {
        removeAgentFromStore(id)
        clearTerminalBuffer(id)
        disposeAgentTerminal(id)
        removePrInfo(id)
      }

      // Clear active terminal tab if it was a removed agent
      if (activeAgentTerminalTab && allIds.includes(activeAgentTerminalTab)) {
        setActiveAgentTerminalTab(null)
        setAgentTerminalPanelOpen(false)
      }
    },
    [agents, activeAgentTerminalTab, removeAgentFromStore, clearTerminalBuffer, removePrInfo, setActiveAgentTerminalTab, setAgentTerminalPanelOpen]
  )

  const handleRerunAgent = useCallback(
    async (agentId: string) => {
      const agent = agents[agentId]
      if (!agent) return

      const { name, task, cwd, files } = agent

      // Remove the old agent (same cleanup as handleRemoveAgent)
      const subagentIds = agent.subagents.map((s) => s.id)
      const allIds = [agentId, ...subagentIds]

      await window.api.removeAgent(agentId)

      for (const id of allIds) {
        removeAgentFromStore(id)
        clearTerminalBuffer(id)
        disposeAgentTerminal(id)
        removePrInfo(id)
      }

      if (activeAgentTerminalTab && allIds.includes(activeAgentTerminalTab)) {
        setActiveAgentTerminalTab(null)
        setAgentTerminalPanelOpen(false)
      }

      // Create a new agent with the same config
      try {
        const newAgent = await window.api.createAgent({
          name,
          task,
          cwd,
          files: files && files.length > 0 ? files : undefined
        })
        addAgent(newAgent)
      } catch (err) {
        console.error('Failed to re-run agent:', err)
      }
    },
    [agents, activeAgentTerminalTab, addAgent, removeAgentFromStore, clearTerminalBuffer, removePrInfo, setActiveAgentTerminalTab, setAgentTerminalPanelOpen]
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
              onRemoveAgent={handleRemoveAgent}
              onOpenTerminal={handleOpenTerminal}
              onRerunAgent={handleRerunAgent}
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
      <ConfirmStopDialog
        open={stopConfirmAgentId !== null}
        agentName={stopConfirmAgentId ? agents[stopConfirmAgentId]?.name || '' : ''}
        onConfirm={handleConfirmStop}
        onCancel={handleCancelStop}
      />
    </div>
  )
}

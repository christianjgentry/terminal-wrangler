import type { AgentInfo } from '@shared/agent-types'
import { agentStatusColors } from '../../lib/agent-status-colors'
import { useGithubStore } from '../../stores/github-store'
import { useAgentStore } from '../../stores/agent-store'
import { useAppStore } from '../../stores/app-store'
import { AgentStatusBadge } from './AgentStatusBadge'
import { AgentMiniTerminal } from './AgentMiniTerminal'
import { AgentTaskList } from './AgentTaskList'
import { ContextUsageBar } from './ContextUsageBar'
import { PrStatusSection } from './PrStatusSection'

interface AgentCardProps {
  agent: AgentInfo
  onStop: (agentId: string) => void
  onRemove: (agentId: string) => void
  onOpenTerminal: (agentId: string) => void
  onRerun: (agentId: string) => void
}

export function AgentCard({ agent, onStop, onRemove, onOpenTerminal, onRerun }: AgentCardProps): JSX.Element {
  const color = agentStatusColors[agent.status]
  const isSubagent = !!agent.parentAgentId
  const isProcessAlive = agent.processAlive !== false
  const isTerminalStatus = agent.status === 'done' || agent.status === 'stopped' || agent.status === 'error'
  const prInfo = useGithubStore((s) => s.prInfoByAgent[agent.id])
  const updateStatus = useAgentStore((s) => s.updateStatus)
  const setActiveAgentTerminalTab = useAppStore((s) => s.setActiveAgentTerminalTab)
  const setAgentTerminalPanelOpen = useAppStore((s) => s.setAgentTerminalPanelOpen)
  const setAgentPlanViewId = useAppStore((s) => s.setAgentPlanViewId)

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

        {/* Mini terminal or task list */}
        {!isSubagent && (
          agent.tasks && agent.tasks.length > 0 ? (
            <AgentTaskList tasks={agent.tasks} />
          ) : agent.status === 'building' ? (
            <AgentTaskList tasks={[]} />
          ) : (
            <AgentMiniTerminal agentId={agent.id} />
          )
        )}

        {/* Context usage bar */}
        {agent.contextUsage && isProcessAlive && !isTerminalStatus && (
          <ContextUsageBar used={agent.contextUsage.used} max={agent.contextUsage.max} />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            {agent.jiraIssueKey && (
              <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
                {agent.jiraIssueKey}
              </span>
            )}
            {agent.subagents.length > 0 && (
              <span className="text-[9px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">
                {agent.subagents.length} subtask{agent.subagents.length !== 1 ? 's' : ''}
              </span>
            )}
            {agent.planFilePath && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const terminalId = agent.parentAgentId || agent.id
                  setActiveAgentTerminalTab(terminalId)
                  setAgentTerminalPanelOpen(true)
                  setAgentPlanViewId(terminalId)
                }}
                className="text-[9px] text-accent-light hover:text-white bg-accent/10 hover:bg-accent/20 px-1.5 py-0.5 rounded transition-colors"
              >
                View Plan
              </button>
            )}
            {agent.branch && (
              <span
                className="text-[9px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded font-mono truncate max-w-[120px]"
                title={agent.branch}
              >
                &#x2387; {agent.branch}
              </span>
            )}
            {agent.detectedPrUrl ? (
              <PrStatusSection
                prUrl={agent.detectedPrUrl}
                prInfo={prInfo}
                agentId={agent.id}
                agentStatus={agent.status}
                onMerged={() => updateStatus(agent.id, 'done')}
              />
            ) : agent.awaitingCommitResponse && (
              <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-[9px] text-yellow-400">
                  💬 Respond in terminal to commit/push
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenTerminal()
                    }}
                    className="px-1.5 py-0.5 text-[8px] rounded transition-colors bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                  >
                    Open Terminal
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateStatus(agent.id, 'done')
                    }}
                    className="px-1.5 py-0.5 text-[8px] rounded transition-colors bg-surface-700 text-surface-300 hover:bg-surface-600"
                  >
                    Mark Done
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleOpenTerminal()
              }}
              className="px-1.5 py-0.5 text-[9px] text-surface-400 hover:text-white bg-surface-700 hover:bg-surface-600 rounded transition-colors"
            >
              Terminal
            </button>
            {isProcessAlive && !isTerminalStatus && (
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
            {!isProcessAlive && !isTerminalStatus && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRerun(agent.id)
                  }}
                  className="px-1.5 py-0.5 text-[9px] text-accent-light hover:text-white bg-accent/10 hover:bg-accent/20 rounded transition-colors"
                >
                  Re-run
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    window.api.markAgentDone(agent.id)
                  }}
                  className="px-1.5 py-0.5 text-[9px] text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded transition-colors"
                >
                  Done
                </button>
              </>
            )}
            {isTerminalStatus && !isProcessAlive && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRerun(agent.id)
                }}
                className="px-1.5 py-0.5 text-[9px] text-accent-light hover:text-white bg-accent/10 hover:bg-accent/20 rounded transition-colors"
              >
                Re-run
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(agent.id)
              }}
              className="px-1.5 py-0.5 text-[9px] text-surface-500 hover:text-red-400 bg-surface-700 hover:bg-red-500/10 rounded transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

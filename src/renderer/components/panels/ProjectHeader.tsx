import { useCallback } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useServiceStore } from '../../stores/service-store'
import { useAgentStore } from '../../stores/agent-store'
import type { ActiveView } from '../../stores/app-store'

interface ProjectHeaderProps {
  onStartAll?: () => void
  onStopAll?: () => void
}

export function ProjectHeader({ onStartAll, onStopAll }: ProjectHeaderProps): JSX.Element {
  const projectName = useAppStore((s) => s.projectName)
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const terminalPanelOpen = useAppStore((s) => s.terminalPanelOpen)
  const setTerminalPanelOpen = useAppStore((s) => s.setTerminalPanelOpen)
  const docsPanelOpen = useAppStore((s) => s.docsPanelOpen)
  const setDocsPanelOpen = useAppStore((s) => s.setDocsPanelOpen)
  const agentTerminalPanelOpen = useAppStore((s) => s.agentTerminalPanelOpen)
  const setAgentTerminalPanelOpen = useAppStore((s) => s.setAgentTerminalPanelOpen)
  const services = useServiceStore((s) => s.services)
  const agents = useAgentStore((s) => s.agents)

  const runningCount = Object.values(services).filter(
    (s) => s.status === 'running' || s.status === 'starting'
  ).length
  const totalCount = Object.keys(services).length
  const agentCount = Object.keys(agents).length

  const handleStopAllAgents = useCallback(async () => {
    await window.api.stopAllAgents()
  }, [])

  return (
    <div className="drag-region h-10 flex items-center px-20 bg-surface-900 border-b border-white/5 shrink-0">
      <span className="no-drag text-sm font-medium text-surface-300">{projectName}</span>

      {/* View switching tabs */}
      <div className="no-drag flex items-center gap-0.5 ml-4 bg-surface-800 rounded-lg p-0.5">
        <button
          onClick={() => setActiveView('services')}
          className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${
            activeView === 'services'
              ? 'text-white bg-surface-700'
              : 'text-surface-400 hover:text-surface-300'
          }`}
        >
          Services
          {activeView === 'services' && (
            <span className="ml-1 text-surface-500">{runningCount}/{totalCount}</span>
          )}
        </button>
        <button
          onClick={() => setActiveView('agents')}
          className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${
            activeView === 'agents'
              ? 'text-white bg-surface-700'
              : 'text-surface-400 hover:text-surface-300'
          }`}
        >
          Agents
          {agentCount > 0 && (
            <span className="ml-1 text-surface-500">{agentCount}</span>
          )}
        </button>
      </div>

      <div className="flex-1" />

      <div className="no-drag flex items-center gap-1.5">
        {activeView === 'services' && (
          <>
            <button
              onClick={() => setDocsPanelOpen(!docsPanelOpen)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${
                docsPanelOpen
                  ? 'text-accent-light bg-accent/20'
                  : 'text-surface-400 bg-white/5 hover:bg-white/10'
              }`}
            >
              Docs
            </button>
            {onStartAll && (
              <button
                onClick={onStartAll}
                className="px-2.5 py-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded transition-colors"
              >
                Start All
              </button>
            )}
            {onStopAll && (
              <button
                onClick={onStopAll}
                className="px-2.5 py-1 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
              >
                Stop All
              </button>
            )}
            <button
              onClick={() => setTerminalPanelOpen(!terminalPanelOpen)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${
                terminalPanelOpen
                  ? 'text-accent-light bg-accent/20'
                  : 'text-surface-400 bg-white/5 hover:bg-white/10'
              }`}
            >
              Terminal
            </button>
          </>
        )}

        {activeView === 'agents' && (
          <>
            {agentCount > 0 && (
              <button
                onClick={handleStopAllAgents}
                className="px-2.5 py-1 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
              >
                Stop All Agents
              </button>
            )}
            <button
              onClick={() => setAgentTerminalPanelOpen(!agentTerminalPanelOpen)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${
                agentTerminalPanelOpen
                  ? 'text-accent-light bg-accent/20'
                  : 'text-surface-400 bg-white/5 hover:bg-white/10'
              }`}
            >
              Terminal
            </button>
          </>
        )}
      </div>
    </div>
  )
}

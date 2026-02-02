import { useAppStore } from '../../stores/app-store'
import { useServiceStore } from '../../stores/service-store'

interface ProjectHeaderProps {
  onStartAll?: () => void
  onStopAll?: () => void
}

export function ProjectHeader({ onStartAll, onStopAll }: ProjectHeaderProps): JSX.Element {
  const projectName = useAppStore((s) => s.projectName)
  const terminalPanelOpen = useAppStore((s) => s.terminalPanelOpen)
  const setTerminalPanelOpen = useAppStore((s) => s.setTerminalPanelOpen)
  const docsPanelOpen = useAppStore((s) => s.docsPanelOpen)
  const setDocsPanelOpen = useAppStore((s) => s.setDocsPanelOpen)
  const services = useServiceStore((s) => s.services)

  const runningCount = Object.values(services).filter(
    (s) => s.status === 'running' || s.status === 'starting'
  ).length
  const totalCount = Object.keys(services).length

  return (
    <div className="drag-region h-10 flex items-center px-20 bg-surface-900 border-b border-white/5 shrink-0">
      <span className="no-drag text-sm font-medium text-surface-300">{projectName}</span>

      <div className="no-drag flex items-center gap-1 ml-3">
        <span className="text-[10px] text-surface-500">
          {runningCount}/{totalCount} running
        </span>
      </div>

      <div className="flex-1" />

      <div className="no-drag flex items-center gap-1.5">
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
      </div>
    </div>
  )
}

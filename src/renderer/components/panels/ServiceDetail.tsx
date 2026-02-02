import { useAppStore } from '../../stores/app-store'
import { useServiceStore } from '../../stores/service-store'
import { StatusBadge } from '../shared/StatusBadge'
import { ServiceDocs } from '../docs/ServiceDocs'

export function ServiceDetail(): JSX.Element | null {
  const selectedId = useAppStore((s) => s.selectedServiceId)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const setSelectedServiceId = useAppStore((s) => s.setSelectedServiceId)
  const setActiveTerminalTab = useAppStore((s) => s.setActiveTerminalTab)
  const setTerminalPanelOpen = useAppStore((s) => s.setTerminalPanelOpen)
  const services = useServiceStore((s) => s.services)

  if (!sidebarOpen || !selectedId) return null

  const service = services[selectedId]
  if (!service) return null

  const { config, status, pid } = service
  const isRunning = status === 'running' || status === 'starting'
  const isStopped = status === 'idle' || status === 'stopped'

  const handleClose = (): void => {
    setSidebarOpen(false)
    setSelectedServiceId(null)
  }

  const handleOpenTerminal = (): void => {
    setActiveTerminalTab(selectedId)
    setTerminalPanelOpen(true)
  }

  return (
    <div className="w-80 h-full bg-surface-900 border-l border-white/5 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">{config.name}</h2>
          <StatusBadge status={status} size="sm" />
        </div>
        <button
          onClick={handleClose}
          className="text-surface-400 hover:text-white transition-colors text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Info section */}
        <div className="px-4 py-3 space-y-2 border-b border-white/5">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">
              Command
            </span>
            <p className="text-xs font-mono text-surface-300 mt-0.5 break-all">{config.command}</p>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">
              Working Directory
            </span>
            <p className="text-xs font-mono text-surface-300 mt-0.5 truncate">
              {config.workingDirectory}
            </p>
          </div>

          {pid && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">
                PID
              </span>
              <p className="text-xs font-mono text-surface-300 mt-0.5">{pid}</p>
            </div>
          )}

          {config.dependsOn.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">
                Dependencies
              </span>
              <div className="flex gap-1 flex-wrap mt-0.5">
                {config.dependsOn.map((dep) => (
                  <span
                    key={dep}
                    className="px-1.5 py-0.5 text-[10px] bg-accent/10 text-accent-light rounded font-medium cursor-pointer hover:bg-accent/20 transition-colors"
                    onClick={() => setSelectedServiceId(dep)}
                  >
                    {services[dep]?.config.name || dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {config.env && Object.keys(config.env).length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">
                Environment
              </span>
              <div className="mt-0.5 space-y-0.5">
                {Object.entries(config.env).map(([key, value]) => (
                  <div key={key} className="text-[10px] font-mono">
                    <span className="text-accent-light">{key}</span>
                    <span className="text-surface-500">=</span>
                    <span className="text-surface-400">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {config.tags && config.tags.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">
                Tags
              </span>
              <div className="flex gap-1 flex-wrap mt-0.5">
                {config.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 text-[10px] bg-white/5 text-surface-400 rounded font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 py-3 flex gap-2 border-b border-white/5 shrink-0">
          {isStopped && (
            <button
              onClick={() => window.api.startService(selectedId)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
            >
              Start
            </button>
          )}
          {isRunning && (
            <>
              <button
                onClick={() => window.api.stopService(selectedId)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                Stop
              </button>
              <button
                onClick={() => window.api.restartService(selectedId)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
              >
                Restart
              </button>
            </>
          )}
          {(status === 'error' || status === 'crashed') && (
            <button
              onClick={() => window.api.startService(selectedId)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={handleOpenTerminal}
            className="px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Terminal
          </button>
        </div>

        {/* Docs */}
        {config.docs && (
          <div className="px-4 py-3">
            <ServiceDocs markdown={config.docs} />
          </div>
        )}
      </div>
    </div>
  )
}

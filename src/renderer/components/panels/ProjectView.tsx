import { useCallback } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useServiceStore } from '../../stores/service-store'
import { ProjectHeader } from './ProjectHeader'
import { ServiceGraph } from '../graph/ServiceGraph'
import { ServiceDetail } from './ServiceDetail'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { DocsPanel } from '../docs/DocsPanel'
import { AgentBoard } from '../agents/AgentBoard'
import { AgentTerminalPanel } from '../agents/AgentTerminalPanel'
import { JiraBrowser } from '../jira/JiraBrowser'
import { SettingsModal } from '../settings/SettingsModal'

export function ProjectView(): JSX.Element {
  const activeView = useAppStore((s) => s.activeView)
  const terminalPanelOpen = useAppStore((s) => s.terminalPanelOpen)
  const agentTerminalPanelOpen = useAppStore((s) => s.agentTerminalPanelOpen)
  const terminalPanelHeight = useAppStore((s) => s.terminalPanelHeight)
  const services = useServiceStore((s) => s.services)
  const serviceCount = Object.keys(services).length

  const handleStartAll = useCallback(() => {
    window.api.startAll()
  }, [])

  const handleStopAll = useCallback(() => {
    window.api.stopAll()
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col">
      <ProjectHeader onStartAll={handleStartAll} onStopAll={handleStopAll} />

      {activeView === 'services' && (
        <>
          <div className="flex-1 flex overflow-hidden">
            {/* Docs panel (left) */}
            <DocsPanel />

            {/* Main content: graph */}
            <div className="flex-1 relative">
              {serviceCount > 0 ? (
                <ServiceGraph />
              ) : (
                <div className="flex items-center justify-center h-full text-surface-500 text-sm">
                  No services defined in config
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <ServiceDetail />
          </div>

          {/* Terminal panel */}
          {terminalPanelOpen && <TerminalPanel height={terminalPanelHeight} />}
        </>
      )}

      {activeView === 'agents' && (
        <>
          <div className="flex-1 flex overflow-hidden">
            <AgentBoard />
          </div>

          {/* Agent terminal panel */}
          {agentTerminalPanelOpen && <AgentTerminalPanel height={terminalPanelHeight} />}
        </>
      )}

      {activeView === 'jira' && (
        <div className="flex-1 flex overflow-hidden">
          <JiraBrowser />
        </div>
      )}

      <SettingsModal />
    </div>
  )
}

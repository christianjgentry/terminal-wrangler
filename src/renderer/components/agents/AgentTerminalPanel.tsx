import { useCallback, useRef, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useAgentStore } from '../../stores/agent-store'
import { AgentStatusBadge } from './AgentStatusBadge'
import { AgentTerminalView } from './AgentTerminalView'

interface AgentTerminalPanelProps {
  height: number
}

export function AgentTerminalPanel({ height }: AgentTerminalPanelProps): JSX.Element {
  const activeTab = useAppStore((s) => s.activeAgentTerminalTab)
  const setActiveTab = useAppStore((s) => s.setActiveAgentTerminalTab)
  const setAgentTerminalPanelOpen = useAppStore((s) => s.setAgentTerminalPanelOpen)
  const setTerminalPanelHeight = useAppStore((s) => s.setTerminalPanelHeight)
  const agents = useAgentStore((s) => s.agents)
  const agentEntries = Object.entries(agents).filter(([_, a]) => !a.parentAgentId)

  const isDragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(height)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true
      startY.current = e.clientY
      startHeight.current = height
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [height]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current) return
      const delta = startY.current - e.clientY
      const newHeight = Math.max(120, Math.min(window.innerHeight - 200, startHeight.current + delta))
      setTerminalPanelHeight(newHeight)
    }

    const handleMouseUp = (): void => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [setTerminalPanelHeight])

  // Auto-select first tab if none selected
  useEffect(() => {
    if (!activeTab && agentEntries.length > 0) {
      setActiveTab(agentEntries[0][0])
    }
  }, [activeTab, agentEntries, setActiveTab])

  return (
    <div
      className="bg-surface-950 border-t border-white/10 flex flex-col shrink-0"
      style={{ height }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1 cursor-row-resize hover:bg-accent/40 transition-colors shrink-0"
      />

      {/* Tab bar */}
      <div className="flex items-center h-8 bg-surface-900 border-b border-white/5 shrink-0 px-2 gap-1 overflow-x-auto">
        {agentEntries.map(([id, agent]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded transition-colors shrink-0 ${
              activeTab === id
                ? 'bg-surface-700 text-white'
                : 'text-surface-400 hover:text-white hover:bg-surface-800'
            }`}
          >
            <AgentStatusBadge status={agent.status} size="sm" />
            <span>{agent.name}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setAgentTerminalPanelOpen(false)}
          className="text-surface-400 hover:text-white transition-colors text-sm leading-none px-1"
        >
          &times;
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden">
        {activeTab && agents[activeTab] ? (
          <AgentTerminalView agentId={activeTab} />
        ) : (
          <div className="flex items-center justify-center h-full text-surface-500 text-xs">
            Select an agent tab to view its terminal
          </div>
        )}
      </div>
    </div>
  )
}

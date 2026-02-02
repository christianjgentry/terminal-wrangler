import { useCallback, useRef, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useServiceStore } from '../../stores/service-store'
import { useDocsStore } from '../../stores/docs-store'
import { StatusBadge } from '../shared/StatusBadge'
import { TerminalView } from './TerminalView'
import { AdhocTerminalView } from './AdhocTerminalView'

interface TerminalPanelProps {
  height: number
}

export function TerminalPanel({ height }: TerminalPanelProps): JSX.Element {
  const activeTab = useAppStore((s) => s.activeTerminalTab)
  const setActiveTab = useAppStore((s) => s.setActiveTerminalTab)
  const setTerminalPanelOpen = useAppStore((s) => s.setTerminalPanelOpen)
  const setTerminalPanelHeight = useAppStore((s) => s.setTerminalPanelHeight)
  const setSelectedServiceId = useAppStore((s) => s.setSelectedServiceId)
  const services = useServiceStore((s) => s.services)
  const serviceEntries = Object.entries(services)
  const runningCommands = useDocsStore((s) => s.runningCommands)
  const docsData = useDocsStore((s) => s.docsData)

  const isAdhocTab = activeTab?.startsWith('adhoc:') ?? false
  const adhocCommandId = isAdhocTab ? activeTab!.slice(6) : null
  const adhocScript = adhocCommandId
    ? docsData?.scripts.find((s) => s.id === adhocCommandId)
    : null

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
    if (!activeTab && serviceEntries.length > 0) {
      setActiveTab(serviceEntries[0][0])
    }
  }, [activeTab, serviceEntries, setActiveTab])

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
        {serviceEntries.map(([id, entry]) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setSelectedServiceId(id) }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded transition-colors shrink-0 ${
              activeTab === id
                ? 'bg-surface-700 text-white'
                : 'text-surface-400 hover:text-white hover:bg-surface-800'
            }`}
          >
            <StatusBadge status={entry.status} size="sm" />
            <span>{entry.config.name}</span>
          </button>
        ))}
        {/* Ad-hoc command tabs */}
        {Array.from(runningCommands).map((cmdId) => {
          const script = docsData?.scripts.find((s) => s.id === cmdId)
          const tabKey = `adhoc:${cmdId}`
          return (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded transition-colors shrink-0 ${
                activeTab === tabKey
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{script?.command ?? cmdId}</span>
            </button>
          )
        })}
        {/* Show adhoc tab even after process exits if it's the active tab */}
        {isAdhocTab && adhocCommandId && !runningCommands.has(adhocCommandId) && (
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded transition-colors shrink-0 bg-surface-700 text-white"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-surface-500" />
            <span>{adhocScript?.command ?? adhocCommandId}</span>
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setTerminalPanelOpen(false)}
          className="text-surface-400 hover:text-white transition-colors text-sm leading-none px-1"
        >
          &times;
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden">
        {isAdhocTab && adhocCommandId ? (
          <AdhocTerminalView commandId={adhocCommandId} />
        ) : activeTab && services[activeTab] ? (
          <TerminalView serviceId={activeTab} />
        ) : (
          <div className="flex items-center justify-center h-full text-surface-500 text-xs">
            Select a service tab to view its terminal
          </div>
        )}
      </div>
    </div>
  )
}

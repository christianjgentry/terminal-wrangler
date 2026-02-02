import { useCallback } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useDocsStore } from '../../stores/docs-store'
import type { DetectedScript } from '@shared/types'

interface ScriptListProps {
  scripts: DetectedScript[]
  projectPath: string
}

export function ScriptList({ scripts, projectPath }: ScriptListProps): JSX.Element {
  const setTerminalPanelOpen = useAppStore((s) => s.setTerminalPanelOpen)
  const setActiveTerminalTab = useAppStore((s) => s.setActiveTerminalTab)
  const runningCommands = useDocsStore((s) => s.runningCommands)
  const addRunningCommand = useDocsStore((s) => s.addRunningCommand)

  const handleRun = useCallback(
    async (script: DetectedScript) => {
      try {
        addRunningCommand(script.id)
        await window.api.runDocsCommand(
          script.id,
          script.command,
          script.workingDirectory,
          projectPath
        )
        setTerminalPanelOpen(true)
        setActiveTerminalTab(`adhoc:${script.id}`)
      } catch (err) {
        console.error('Failed to run command:', err)
      }
    },
    [projectPath, addRunningCommand, setTerminalPanelOpen, setActiveTerminalTab]
  )

  const handleStop = useCallback(async (script: DetectedScript) => {
    try {
      await window.api.stopDocsCommand(script.id)
    } catch (err) {
      console.error('Failed to stop command:', err)
    }
  }, [])

  if (scripts.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-surface-500 text-xs">
        No scripts in this category
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {scripts.map((script) => {
        const isRunning = runningCommands.has(script.id)

        return (
          <div
            key={script.id}
            className="group flex items-center gap-2 px-3 py-2 rounded hover:bg-white/5 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-surface-200 truncate">
                  {script.command}
                </span>
                {script.isLongRunning && (
                  <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent-light">
                    long-running
                  </span>
                )}
              </div>
              <div className="text-[10px] text-surface-500 mt-0.5">{script.source}</div>
            </div>

            <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {isRunning ? (
                <button
                  onClick={() => handleStop(script)}
                  className="px-2 py-0.5 text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => handleRun(script)}
                  className="px-2 py-0.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded transition-colors"
                >
                  Run
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

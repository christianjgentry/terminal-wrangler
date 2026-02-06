import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useAgentStore } from '../../stores/agent-store'
import { TERMINAL_OPTIONS } from '../../lib/terminal-config'
import '@xterm/xterm/css/xterm.css'

interface AgentTerminalViewProps {
  agentId: string
  onRerun?: (agentId: string) => void
}

const agentTerminalInstances = new Map<string, { terminal: Terminal; fitAddon: FitAddon }>()

export function disposeAgentTerminal(agentId: string): void {
  const instance = agentTerminalInstances.get(agentId)
  if (instance) {
    instance.terminal.dispose()
    agentTerminalInstances.delete(agentId)
  }
}

export function AgentTerminalView({ agentId, onRerun }: AgentTerminalViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const agent = useAgentStore((s) => s.agents[agentId])
  const isProcessAlive = agent?.processAlive !== false
  const isTerminalStatus = agent?.status === 'done' || agent?.status === 'stopped' || agent?.status === 'error'

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let instance = agentTerminalInstances.get(agentId)

    if (!instance) {
      const terminal = new Terminal(TERMINAL_OPTIONS)

      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)

      instance = { terminal, fitAddon }
      agentTerminalInstances.set(agentId, instance)

      terminal.onData((data) => {
        window.api.sendAgentTerminalInput(agentId, data)
      })
    }

    // Open or re-attach
    const isReattach = !!instance.terminal.element
    if (isReattach) {
      container.appendChild(instance.terminal.element)
    } else {
      instance.terminal.open(container)
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          instance!.fitAddon.fit()
          const { cols, rows } = instance!.terminal
          window.api.resizeAgentTerminal(agentId, cols, rows)
          instance!.terminal.focus()
        } catch {
          // Ignore fit errors during mount
        }
      })
    })

    // Replay buffer for new terminals
    if (!isReattach) {
      window.api.getAgentTerminalBuffer(agentId).then((buffer) => {
        if (buffer) {
          instance!.terminal.write(buffer)
        }
      })
    }

    const unsubData = window.api.onAgentTerminalData((payload) => {
      if (payload.agentId === agentId) {
        instance!.terminal.write(payload.data)
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      try {
        instance!.fitAddon.fit()
        const { cols, rows } = instance!.terminal
        window.api.resizeAgentTerminal(agentId, cols, rows)
      } catch {
        // Ignore
      }
    })
    resizeObserver.observe(container)

    cleanupRef.current = () => {
      unsubData()
      resizeObserver.disconnect()
      container.innerHTML = ''
    }

    return () => {
      cleanupRef.current?.()
    }
  }, [agentId])

  const showBanner = !isProcessAlive && !isTerminalStatus

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {showBanner && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-3 py-1.5 bg-surface-900/85 backdrop-blur-sm border-b border-white/10 z-10">
          <span className="text-[11px] text-surface-400">Process exited</span>
          {onRerun && (
            <button
              onClick={() => onRerun(agentId)}
              className="px-2 py-0.5 text-[10px] text-accent-light hover:text-white bg-accent/10 hover:bg-accent/20 rounded transition-colors"
            >
              Re-run
            </button>
          )}
          <button
            onClick={() => window.api.markAgentDone(agentId)}
            className="px-2 py-0.5 text-[10px] text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded transition-colors"
          >
            Mark Done
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface AgentTerminalViewProps {
  agentId: string
}

const agentTerminalInstances = new Map<string, { terminal: Terminal; fitAddon: FitAddon }>()

export function disposeAgentTerminal(agentId: string): void {
  const instance = agentTerminalInstances.get(agentId)
  if (instance) {
    instance.terminal.dispose()
    agentTerminalInstances.delete(agentId)
  }
}

export function AgentTerminalView({ agentId }: AgentTerminalViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let instance = agentTerminalInstances.get(agentId)

    if (!instance) {
      const terminal = new Terminal({
        theme: {
          background: '#141420',
          foreground: '#e4e4e9',
          cursor: '#7c3aed',
          selectionBackground: '#7c3aed44',
          black: '#1e1e2e',
          red: '#ef4444',
          green: '#10b981',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#e4e4e9',
          brightBlack: '#6b7280',
          brightRed: '#f87171',
          brightGreen: '#34d399',
          brightYellow: '#fbbf24',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff'
        },
        fontSize: 12,
        fontFamily: 'SF Mono, Menlo, Monaco, Courier New, monospace',
        cursorBlink: true,
        scrollback: 5000,
        convertEol: true
      })

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

  return <div ref={containerRef} className="w-full h-full" />
}

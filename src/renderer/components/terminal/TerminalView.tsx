import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalViewProps {
  serviceId: string
}

const terminalInstances = new Map<string, { terminal: Terminal; fitAddon: FitAddon }>()

export function TerminalView({ serviceId }: TerminalViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Reuse or create terminal instance
    let instance = terminalInstances.get(serviceId)

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
      terminalInstances.set(serviceId, instance)

      // User input -> IPC
      terminal.onData((data) => {
        window.api.sendTerminalInput(serviceId, data)
      })
    }

    // Open or re-attach terminal in container.
    // xterm.js open() is a no-op when called a second time (it checks
    // this.element internally), so for cached instances we re-attach
    // the existing DOM element instead.
    const isReattach = !!instance.terminal.element
    if (isReattach) {
      container.appendChild(instance.terminal.element)
    } else {
      instance.terminal.open(container)
    }

    // Fit to container — double rAF ensures layout is complete before measuring
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          instance!.fitAddon.fit()
          const { cols, rows } = instance!.terminal
          window.api.resizeTerminal(serviceId, cols, rows)
        } catch {
          // Ignore fit errors during mount
        }
      })
    })

    // Replay buffer for new terminals; reattached ones already have content
    if (!isReattach) {
      window.api.getTerminalBuffer(serviceId).then((buffer) => {
        if (buffer) {
          instance!.terminal.write(buffer)
        }
      })
    }

    // Listen for terminal data
    const unsubData = window.api.onTerminalData((payload) => {
      if (payload.serviceId === serviceId) {
        instance!.terminal.write(payload.data)
      }
    })

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        instance!.fitAddon.fit()
        const { cols, rows } = instance!.terminal
        window.api.resizeTerminal(serviceId, cols, rows)
      } catch {
        // Ignore
      }
    })
    resizeObserver.observe(container)

    cleanupRef.current = () => {
      unsubData()
      resizeObserver.disconnect()
      // Don't dispose terminal - keep it for re-use
      // Just detach from DOM
      container.innerHTML = ''
    }

    return () => {
      cleanupRef.current?.()
    }
  }, [serviceId])

  return <div ref={containerRef} className="w-full h-full" />
}

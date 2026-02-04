import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface AdhocTerminalViewProps {
  commandId: string
}

const terminalInstances = new Map<string, { terminal: Terminal; fitAddon: FitAddon }>()

export function AdhocTerminalView({ commandId }: AdhocTerminalViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let instance = terminalInstances.get(commandId)

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
      terminalInstances.set(commandId, instance)

      terminal.onData((data) => {
        window.api.sendDocsCommandInput(commandId, data)
      })
    }

    // Open or re-attach terminal in container.
    // xterm.js open() is a no-op when called a second time, so for cached
    // instances we re-attach the existing DOM element instead.
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
          window.api.resizeDocsCommand(commandId, cols, rows)
        } catch {
          // Ignore fit errors during mount
        }
      })
    })

    // Replay buffer for new terminals; reattached ones already have content
    if (!isReattach) {
      window.api.getDocsCommandBuffer(commandId).then((buffer) => {
        if (buffer) {
          instance!.terminal.write(buffer)
        }
      })
    }

    const unsubOutput = window.api.onDocsCommandOutput((payload) => {
      if (payload.commandId === commandId) {
        instance!.terminal.write(payload.data)
      }
    })

    const unsubExit = window.api.onDocsCommandExit((payload) => {
      if (payload.commandId === commandId) {
        instance!.terminal.write(
          `\r\n\x1b[90m[Process exited with code ${payload.exitCode}]\x1b[0m\r\n`
        )
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      try {
        instance!.fitAddon.fit()
        const { cols, rows } = instance!.terminal
        window.api.resizeDocsCommand(commandId, cols, rows)
      } catch {
        // Ignore
      }
    })
    resizeObserver.observe(container)

    cleanupRef.current = () => {
      unsubOutput()
      unsubExit()
      resizeObserver.disconnect()
      container.innerHTML = ''
    }

    return () => {
      cleanupRef.current?.()
    }
  }, [commandId])

  return <div ref={containerRef} className="w-full h-full" />
}

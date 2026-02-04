import type * as pty from 'node-pty'
import type { AgentStatus } from '@shared/agent-types'
import { type AgentProcessEvents, type AgentConfig, OUTPUT_BUFFER_SIZE } from './types'
import { StatusDetector } from './status-detector'
import { cleanEnvForPty } from '../pty-env'

const KILL_TIMEOUT = 5000

export class AgentProcess {
  readonly id: string
  readonly config: AgentConfig
  private ptyProcess: pty.IPty | null = null
  private _status: AgentStatus = 'idle'
  private outputBuffer = ''
  private events: AgentProcessEvents
  private batchBuffer = ''
  private batchTimer: NodeJS.Timeout | null = null
  private statusDetector: StatusDetector

  constructor(config: AgentConfig, events: AgentProcessEvents) {
    this.id = config.id
    this.config = config
    this.events = events

    this.statusDetector = new StatusDetector({
      onStatusChange: (status: AgentStatus) => {
        this._status = status
        this.events.onStatusChange(this.id, status)
      },
      onSubagentDetected: (taskDescription: string) => {
        this.events.onSubagentDetected(this.id, taskDescription)
      },
      onPrDetected: (prUrl: string) => {
        this.events.onPrDetected(this.id, prUrl)
      },
      onContextUsageChanged: (used: number, max: number) => {
        this.events.onContextUsageChanged(this.id, used, max)
      },
      onTasksChanged: (tasks) => {
        this.events.onTasksChanged(this.id, tasks)
      }
    })
  }

  get status(): AgentStatus {
    return this._status
  }

  get pid(): number | undefined {
    return this.ptyProcess?.pid
  }

  getOutputBuffer(): string {
    return this.outputBuffer
  }

  async start(): Promise<void> {
    if (this._status !== 'idle' && this._status !== 'stopped' && this._status !== 'error') {
      return
    }

    this.outputBuffer = ''

    try {
      const nodePty = await import('node-pty')
      const shell = process.env.SHELL || '/bin/bash'

      this.ptyProcess = nodePty.spawn(shell, ['-l'], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: this.config.cwd,
        env: {
          ...cleanEnvForPty(),
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        }
      })

      this.ptyProcess.onData((data: string) => {
        this.appendOutput(data)
        this.batchAndSend(data)
        this.statusDetector.feed(data)
      })

      this.ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        this.ptyProcess = null

        // Flush remaining batched output
        if (this.batchTimer) {
          clearTimeout(this.batchTimer)
          if (this.batchBuffer) {
            this.events.onData(this.id, this.batchBuffer)
            this.batchBuffer = ''
          }
          this.batchTimer = null
        }

        this.statusDetector.setExited(exitCode)
        this.events.onExit(this.id, exitCode)
      })

      // Write the claude command with the task prompt after a brief delay
      // to let the shell initialize
      setTimeout(() => {
        if (this.ptyProcess) {
          const sanitizedTask = this.config.task
            .replace(/\r\n/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
          const escapedTask = sanitizedTask.replace(/'/g, "'\\''")
          let cmd = `claude --dangerously-skip-permissions '${escapedTask}'`
          if (this.config.files && this.config.files.length > 0) {
            const escapedFiles = this.config.files
              .map((f) => `'${f.replace(/'/g, "'\\''")}'`)
              .join(' ')
            cmd += ` ${escapedFiles}`
          }
          this.ptyProcess.write(`${cmd}\r`)
        }
      }, 500)
    } catch (err) {
      this._status = 'error'
      this.events.onStatusChange(this.id, 'error')
      const msg = err instanceof Error ? err.message : String(err)
      this.appendOutput(`\r\n[Terminal Wrangler] Failed to start agent: ${msg}\r\n`)
      this.events.onData(this.id, `\r\n[Terminal Wrangler] Failed to start agent: ${msg}\r\n`)
    }
  }

  async stop(): Promise<void> {
    if (!this.ptyProcess) {
      this._status = 'stopped'
      this.events.onStatusChange(this.id, 'stopped')
      return
    }

    this._status = 'stopped'
    this.events.onStatusChange(this.id, 'stopped')

    try {
      this.ptyProcess.kill('SIGTERM')
    } catch {
      // Process may already be dead
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (this.ptyProcess) {
          try {
            this.ptyProcess.kill('SIGKILL')
          } catch {
            // Ignore
          }
        }
        resolve()
      }, KILL_TIMEOUT)

      const checkInterval = setInterval(() => {
        if (!this.ptyProcess) {
          clearTimeout(timeout)
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
  }

  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data)
    }
  }

  resize(cols: number, rows: number): void {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.resize(cols, rows)
      } catch {
        // Ignore resize errors
      }
    }
  }

  private appendOutput(data: string): void {
    this.outputBuffer += data
    if (this.outputBuffer.length > OUTPUT_BUFFER_SIZE) {
      this.outputBuffer = this.outputBuffer.slice(-OUTPUT_BUFFER_SIZE)
    }
  }

  private batchAndSend(data: string): void {
    this.batchBuffer += data

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.events.onData(this.id, this.batchBuffer)
        this.batchBuffer = ''
        this.batchTimer = null
      }, 16)
    }
  }
}

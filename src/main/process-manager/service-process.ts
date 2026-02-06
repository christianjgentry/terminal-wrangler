import type * as pty from 'node-pty'
import type { ServiceConfig, ServiceStatus } from '@shared/types'
import { type ProcessEvents, OUTPUT_BUFFER_SIZE } from './types'
import { cleanEnvForPty } from '../pty-env'
import { createLogger } from '../lib/logger'

const logger = createLogger('ServiceProcess')

const KILL_TIMEOUT = 5000

export class ServiceProcess {
  readonly id: string
  readonly config: ServiceConfig
  private ptyProcess: pty.IPty | null = null
  private _status: ServiceStatus = 'idle'
  private outputBuffer = ''
  private events: ProcessEvents
  private batchBuffer = ''
  private batchTimer: NodeJS.Timeout | null = null

  constructor(config: ServiceConfig, events: ProcessEvents) {
    this.id = config.id
    this.config = config
    this.events = events
  }

  get status(): ServiceStatus {
    return this._status
  }

  get pid(): number | undefined {
    return this.ptyProcess?.pid
  }

  getOutputBuffer(): string {
    return this.outputBuffer
  }

  async start(): Promise<void> {
    if (this._status === 'running' || this._status === 'starting') {
      return
    }

    this.setStatus('starting')
    this.outputBuffer = ''
    logger.info(`Starting service '${this.id}' (command: ${this.config.command}, cwd: ${this.config.workingDirectory})`)

    try {
      // Dynamic import node-pty (native module)
      const nodePty = await import('node-pty')

      // Parse command into shell + args
      const shell = process.env.SHELL || '/bin/bash'

      this.ptyProcess = nodePty.spawn(shell, ['-c', this.config.command], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: this.config.workingDirectory,
        env: {
          ...cleanEnvForPty(),
          ...this.config.env,
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        }
      })

      this.ptyProcess.onData((data: string) => {
        this.appendOutput(data)
        this.batchAndSend(data)
      })

      this.ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        logger.info(`Service '${this.id}' exited (code: ${exitCode})`)
        this.ptyProcess = null

        if (this._status === 'stopping') {
          this.setStatus('stopped')
        } else if (exitCode === 0) {
          this.setStatus('stopped')
        } else {
          this.setStatus('crashed')
        }

        this.events.onExit(this.id, exitCode)
      })

      logger.info(`Service '${this.id}' spawned (pid: ${this.ptyProcess.pid})`)

      // If no health check, transition to running immediately
      if (!this.config.healthCheck) {
        this.setStatus('running', this.ptyProcess.pid)
      } else {
        // Health checker will transition to running
        this.events.onStatusChange(this.id, 'starting', this.ptyProcess.pid)
      }
    } catch (err) {
      logger.error(`Service '${this.id}' failed to start:`, err)
      this.setStatus('error')
      const msg = err instanceof Error ? err.message : String(err)
      this.appendOutput(`\r\n[Terminal Wrangler] Failed to start: ${msg}\r\n`)
      this.events.onData(this.id, `\r\n[Terminal Wrangler] Failed to start: ${msg}\r\n`)
    }
  }

  /** Stop the service process: SIGTERM for graceful shutdown, then SIGKILL after timeout.
   *  Standard daemon stop pattern — services should handle SIGTERM for clean exit. */
  async stop(): Promise<void> {
    if (!this.ptyProcess) {
      this.setStatus('stopped')
      return
    }

    logger.info(`Stopping service '${this.id}'`)
    this.setStatus('stopping')

    // Try graceful SIGTERM first
    try {
      this.ptyProcess.kill('SIGTERM')
    } catch (err) {
      logger.debug('SIGTERM failed (process may be dead):', err)
    }

    // Force kill after timeout
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (this.ptyProcess) {
          try {
            this.ptyProcess.kill('SIGKILL')
          } catch (err) {
            logger.debug('SIGKILL failed (process may be dead):', err)
          }
        }
        resolve()
      }, KILL_TIMEOUT)

      // Check if already exited
      const checkInterval = setInterval(() => {
        if (!this.ptyProcess) {
          clearTimeout(timeout)
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
  }

  async restart(): Promise<void> {
    await this.stop()
    await this.start()
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

  private setStatus(status: ServiceStatus, pid?: number): void {
    this._status = status
    this.events.onStatusChange(this.id, status, pid ?? this.ptyProcess?.pid)
  }

  private appendOutput(data: string): void {
    this.outputBuffer += data
    // Ring buffer: keep last OUTPUT_BUFFER_SIZE bytes
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
      }, 16) // ~60fps batching
    }
  }

  // Allow health checker to set status to running
  setRunning(): void {
    if (this._status === 'starting') {
      this.setStatus('running', this.ptyProcess?.pid)
    }
  }

  setError(): void {
    if (this._status === 'starting') {
      this.setStatus('error')
    }
  }
}

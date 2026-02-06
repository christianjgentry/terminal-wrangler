import type * as pty from 'node-pty'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { AgentStatus } from '@shared/agent-types'
import { type AgentProcessEvents, type AgentConfig, OUTPUT_BUFFER_SIZE } from './types'
import { StatusDetector } from './status-detector'
import { cleanEnvForPty } from '../pty-env'

const CTRL_C_TIMEOUT = 2000
const SIGTERM_TIMEOUT = 3000
const SIGKILL_TIMEOUT = 1000

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
      },
      onPlanDetected: (planFilePath) => {
        this.events.onPlanDetected(this.id, planFilePath)
      },
      onInputNeeded: (prompt) => {
        this.events.onInputNeeded(this.id, prompt)
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
          let taskText = this.config.task
          if (this.config.planMode) {
            taskText = `Before implementing anything, first use the EnterPlanMode tool to create a detailed implementation plan. Once the plan is approved, proceed with implementation.\n\n${taskText}`
          }

          // Write task to a temp file and use $(cat ...) to avoid PTY line-length limits
          const taskDir = join(tmpdir(), 'terminal-wrangler-tasks')
          mkdirSync(taskDir, { recursive: true })
          const taskFile = join(taskDir, `task-${this.id}.txt`)
          writeFileSync(taskFile, taskText, 'utf-8')

          const escapedTaskFile = taskFile.replace(/'/g, "'\\''")
          let cmd = `claude --dangerously-skip-permissions "$(cat '${escapedTaskFile}')"`
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
    this.statusDetector.setStopped()

    if (!this.ptyProcess) {
      return
    }

    // Stage 1: Ctrl+C — sends SIGINT to the foreground process group
    this.ptyProcess.write('\x03')
    if (await this.waitForExit(CTRL_C_TIMEOUT)) return

    // Stage 2: Second Ctrl+C in case the first was absorbed by a prompt
    if (this.ptyProcess) this.ptyProcess.write('\x03')
    if (await this.waitForExit(CTRL_C_TIMEOUT)) return

    // Stage 3: SIGTERM
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill('SIGTERM')
      } catch {
        // Process may already be dead
      }
    }
    if (await this.waitForExit(SIGTERM_TIMEOUT)) return

    // Stage 4: SIGKILL — force kill
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill('SIGKILL')
      } catch {
        // Ignore
      }
    }
    await this.waitForExit(SIGKILL_TIMEOUT)
  }

  private waitForExit(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.ptyProcess) {
        resolve(true)
        return
      }

      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
        resolve(false)
      }, timeoutMs)

      const checkInterval = setInterval(() => {
        if (!this.ptyProcess) {
          clearTimeout(timeout)
          clearInterval(checkInterval)
          resolve(true)
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

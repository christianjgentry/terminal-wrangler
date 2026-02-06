import type * as pty from 'node-pty'
import { IPC } from '@shared/ipc-channels'
import { broadcast } from '../lib/broadcast'
import { cleanEnvForPty } from '../pty-env'

const KILL_TIMEOUT = 5000
const OUTPUT_BUFFER_SIZE = 100 * 1024

interface AdhocEntry {
  ptyProcess: pty.IPty
  outputBuffer: string
  batchBuffer: string
  batchTimer: NodeJS.Timeout | null
}

const processes = new Map<string, AdhocEntry>()

function batchAndSend(commandId: string, entry: AdhocEntry, data: string): void {
  entry.batchBuffer += data

  if (!entry.batchTimer) {
    entry.batchTimer = setTimeout(() => {
      broadcast(IPC.DOCS_COMMAND_OUTPUT, { commandId, data: entry.batchBuffer })
      entry.batchBuffer = ''
      entry.batchTimer = null
    }, 16)
  }
}

export async function runCommand(
  commandId: string,
  command: string,
  cwd: string,
  projectPath: string
): Promise<void> {
  // Stop existing process with same id
  await stopCommand(commandId)

  const nodePty = await import('node-pty')
  const shell = process.env.SHELL || '/bin/bash'

  const ptyProcess = nodePty.spawn(shell, ['-c', command], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: cwd || projectPath,
    env: {
      ...cleanEnvForPty(),
      TERM: 'xterm-256color',
      FORCE_COLOR: '1'
    }
  })

  const entry: AdhocEntry = {
    ptyProcess,
    outputBuffer: '',
    batchBuffer: '',
    batchTimer: null
  }

  processes.set(commandId, entry)

  ptyProcess.onData((data: string) => {
    entry.outputBuffer += data
    if (entry.outputBuffer.length > OUTPUT_BUFFER_SIZE) {
      entry.outputBuffer = entry.outputBuffer.slice(-OUTPUT_BUFFER_SIZE)
    }
    batchAndSend(commandId, entry, data)
  })

  ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
    // Flush any remaining batched output
    if (entry.batchTimer) {
      clearTimeout(entry.batchTimer)
      if (entry.batchBuffer) {
        broadcast(IPC.DOCS_COMMAND_OUTPUT, { commandId, data: entry.batchBuffer })
        entry.batchBuffer = ''
      }
      entry.batchTimer = null
    }

    processes.delete(commandId)
    broadcast(IPC.DOCS_COMMAND_EXIT, { commandId, exitCode })
  })
}

/** Stop an ad-hoc command: SIGTERM only with a SIGKILL fallback.
 *  Short-lived commands don't need the Ctrl+C escalation that interactive CLIs require. */
export async function stopCommand(commandId: string): Promise<void> {
  const entry = processes.get(commandId)
  if (!entry) return

  try {
    entry.ptyProcess.kill('SIGTERM')
  } catch {
    // Process may already be dead
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      const current = processes.get(commandId)
      if (current) {
        try {
          current.ptyProcess.kill('SIGKILL')
        } catch {
          // Ignore
        }
      }
      resolve()
    }, KILL_TIMEOUT)

    const checkInterval = setInterval(() => {
      if (!processes.has(commandId)) {
        clearTimeout(timeout)
        clearInterval(checkInterval)
        resolve()
      }
    }, 100)
  })
}

export function writeInput(commandId: string, data: string): void {
  const entry = processes.get(commandId)
  if (entry) {
    entry.ptyProcess.write(data)
  }
}

export function resize(commandId: string, cols: number, rows: number): void {
  const entry = processes.get(commandId)
  if (entry) {
    try {
      entry.ptyProcess.resize(cols, rows)
    } catch {
      // Ignore resize errors
    }
  }
}

export function getBuffer(commandId: string): string {
  const entry = processes.get(commandId)
  return entry?.outputBuffer ?? ''
}

export function isRunning(commandId: string): boolean {
  return processes.has(commandId)
}

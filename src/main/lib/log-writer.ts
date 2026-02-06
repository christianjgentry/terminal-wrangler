import { createWriteStream, mkdirSync, renameSync, statSync, type WriteStream } from 'fs'
import { join } from 'path'
import { app } from 'electron'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const FLUSH_INTERVAL = 100 // ms
const FLUSH_SIZE = 4096 // bytes

let stream: WriteStream | null = null
let buffer = ''
let flushTimer: NodeJS.Timeout | null = null
let logFilePath = ''

export function getLogFilePath(): string {
  return logFilePath
}

export function initLogWriter(): void {
  try {
    const logsDir = app.getPath('logs')
    mkdirSync(logsDir, { recursive: true })
    logFilePath = join(logsDir, 'main.log')
    rotateIfNeeded()
    stream = createWriteStream(logFilePath, { flags: 'a' })
    stream.on('error', () => {
      // Silently fall back to console-only
      stream = null
    })
  } catch {
    // Fall back to console-only if file write setup fails
    stream = null
  }
}

export function writeLog(line: string): void {
  // Always write to console
  process.stdout.write(line + '\n')

  if (!stream) return

  buffer += line + '\n'

  if (buffer.length >= FLUSH_SIZE) {
    flush()
  } else if (!flushTimer) {
    flushTimer = setTimeout(flush, FLUSH_INTERVAL)
  }
}

export function shutdownLogWriter(): void {
  flush()
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (stream) {
    stream.end()
    stream = null
  }
}

function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (!stream || !buffer) return

  try {
    stream.write(buffer)
    buffer = ''
    rotateIfNeeded()
  } catch {
    stream = null
  }
}

function rotateIfNeeded(): void {
  try {
    const stats = statSync(logFilePath)
    if (stats.size > MAX_FILE_SIZE) {
      // Close current stream before rename
      if (stream) {
        stream.end()
      }
      renameSync(logFilePath, logFilePath + '.1')
      stream = createWriteStream(logFilePath, { flags: 'a' })
      stream.on('error', () => {
        stream = null
      })
    }
  } catch {
    // File doesn't exist yet or stat failed — fine
  }
}

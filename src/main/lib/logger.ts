import { writeLog } from './log-writer'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const LEVEL_LABEL: Record<LogLevel, string> = { debug: 'DEBUG', info: 'INFO ', warn: 'WARN ', error: 'ERROR' }

let currentLevel: LogLevel = 'debug'

export function setLogLevel(level: LogLevel): void {
  currentLevel = level
}

// Patterns to redact from log output
const SENSITIVE_PATTERNS = [
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, // JWT-like tokens
  /(?:Bearer\s+)[A-Za-z0-9_-]{20,}/gi, // Bearer tokens
  /sk-[A-Za-z0-9]{20,}/g, // API keys
  /ghp_[A-Za-z0-9]{20,}/g, // GitHub personal access tokens
  /gho_[A-Za-z0-9]{20,}/g // GitHub OAuth tokens
]

function redact(text: string): string {
  let result = text
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

function serializeArg(arg: unknown): string {
  if (arg === null) return 'null'
  if (arg === undefined) return 'undefined'
  if (typeof arg === 'string') return arg
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg)
  if (arg instanceof Error) {
    return arg.stack || `${arg.name}: ${arg.message}`
  }
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

function formatTimestamp(): string {
  const now = new Date()
  const y = now.getFullYear()
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms}`
}

function log(level: LogLevel, module: string, args: unknown[]): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel]) return

  const message = args.map(serializeArg).join(' ')
  const line = redact(`[${formatTimestamp()}] [${LEVEL_LABEL[level]}] [${module}] ${message}`)
  writeLog(line)
}

export function createLogger(module: string): Logger {
  return {
    info: (...args) => log('info', module, args),
    warn: (...args) => log('warn', module, args),
    error: (...args) => log('error', module, args),
    debug: (...args) => log('debug', module, args)
  }
}

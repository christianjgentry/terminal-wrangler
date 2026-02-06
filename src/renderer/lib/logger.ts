interface Logger {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const CONSOLE_FN: Record<LogLevel, (...args: unknown[]) => void> = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
}

function log(level: LogLevel, module: string, args: unknown[]): void {
  // Write to browser console
  CONSOLE_FN[level](`[${module}]`, ...args)

  // Forward to main process for file logging
  try {
    window.api.log(level, module, ...args)
  } catch {
    // Preload bridge not available yet — ignore
  }
}

export function createRendererLogger(module: string): Logger {
  const prefixed = `R:${module}`
  return {
    info: (...args) => log('info', prefixed, args),
    warn: (...args) => log('warn', prefixed, args),
    error: (...args) => log('error', prefixed, args),
    debug: (...args) => log('debug', prefixed, args)
  }
}

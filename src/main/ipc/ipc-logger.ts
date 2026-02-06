import { ipcMain, type IpcMainInvokeEvent, type IpcMainEvent } from 'electron'
import { createLogger } from '../lib/logger'

const logger = createLogger('IPC')

// High-frequency channels that should not be logged
const SILENT_CHANNELS = new Set([
  'terminal:input',
  'terminal:resize',
  'agent:terminal-input',
  'agent:terminal-resize',
  'docs:command-input',
  'docs:command-resize',
  'log:from-renderer'
])

function summarizeArgs(args: unknown[]): string {
  if (args.length === 0) return ''
  const parts: string[] = []
  for (const arg of args) {
    if (arg === undefined || arg === null) continue
    if (typeof arg === 'string') {
      parts.push(arg.length > 80 ? arg.slice(0, 80) + '...' : arg)
    } else if (typeof arg === 'number' || typeof arg === 'boolean') {
      parts.push(String(arg))
    } else if (typeof arg === 'object') {
      const keys = Object.keys(arg as Record<string, unknown>)
      parts.push(`{${keys.join(',')}}`)
    }
  }
  return parts.length > 0 ? ` (${parts.join(', ')})` : ''
}

export function handleWithLogging(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
): void {
  const silent = SILENT_CHANNELS.has(channel)

  ipcMain.handle(channel, async (event, ...args) => {
    if (!silent) logger.debug(`-> ${channel}${summarizeArgs(args)}`)
    const start = Date.now()
    try {
      const result = await handler(event, ...args)
      if (!silent) logger.debug(`<- ${channel} (${Date.now() - start}ms) ok`)
      return result
    } catch (err) {
      logger.error(`<- ${channel} (${Date.now() - start}ms) FAILED:`, err)
      throw err
    }
  })
}

export function onWithLogging(
  channel: string,
  handler: (event: IpcMainEvent, ...args: unknown[]) => void
): void {
  const silent = SILENT_CHANNELS.has(channel)

  ipcMain.on(channel, (event, ...args) => {
    if (!silent) logger.debug(`>> ${channel}${summarizeArgs(args)}`)
    try {
      handler(event, ...args)
    } catch (err) {
      logger.error(`>> ${channel} FAILED:`, err)
    }
  })
}

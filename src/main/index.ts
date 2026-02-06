import { app, BrowserWindow, shell, nativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { processManager } from './process-manager'
import { agentProcessManager } from './agent-manager'
import { githubManager } from './github-manager'
import { sessionUsageManager } from './session-usage-manager'
import { configLoader } from './config'
import { createLogger } from './lib/logger'
import { initLogWriter, shutdownLogWriter, getLogFilePath } from './lib/log-writer'

initLogWriter()

const logger = createLogger('Main')

logger.info(`App starting (version=${app.getVersion()}, pid=${process.pid})`)
logger.info(`Log file: ${getLogFilePath()}`)

process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection:', reason))
process.on('uncaughtException', (error) => logger.error('Uncaught exception:', error))

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const iconPath = join(__dirname, '../../build/icon.png')
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: nativeImage.createFromPath(iconPath),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#1e1e2e',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  logger.info('App ready')
  registerIpcHandlers()
  sessionUsageManager.startPolling()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', async (event) => {
  event.preventDefault()
  logger.info('App quitting — starting cleanup')
  try {
    sessionUsageManager.stopPolling()
    githubManager.stopAllPolling()
    await agentProcessManager.stopAll()
    await processManager.stopAll()
    await configLoader.stopWatching()
  } catch (err) {
    logger.error('Cleanup error:', err)
  }
  logger.info('Cleanup complete, exiting')
  shutdownLogWriter()
  app.exit(0)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

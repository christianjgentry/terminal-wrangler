import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { IPC } from '@shared/ipc-channels'
import { configLoader } from '../config'
import { configGenerator } from '../config/generator'
import { processManager } from '../process-manager'
import { appStore } from '../store'
import type { AppSettings, RecentProject } from '@shared/types'

export function registerIpcHandlers(): void {
  // ── Project ──────────────────────────────────────────
  ipcMain.handle(IPC.PROJECT_OPEN, async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return null

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
      title: 'Open Project Directory'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle(IPC.PROJECT_OPEN_RECENT, async (_event, projectPath: string) => {
    const config = await configLoader.load(projectPath)
    processManager.setConfigs(config.services)
    addRecentProject(projectPath, config.project.name)
    startConfigWatcher(projectPath)
    return config
  })

  // ── Config ──────────────────────────────────────────
  ipcMain.handle(IPC.CONFIG_LOAD, async (_event, projectPath: string) => {
    const config = await configLoader.load(projectPath)
    processManager.setConfigs(config.services)
    addRecentProject(projectPath, config.project.name)
    startConfigWatcher(projectPath)
    return config
  })

  // ── Config generation ──────────────────────────────────
  ipcMain.handle(IPC.CONFIG_GENERATE, (_event, projectPath: string) => {
    return configGenerator.generate(projectPath)
  })

  ipcMain.handle(IPC.CONFIG_SAVE, (_event, projectPath: string, yamlContent: string) => {
    const filePath = join(projectPath, '.terminal-wrangler.yml')
    writeFileSync(filePath, yamlContent, 'utf-8')
  })

  // ── Process management ──────────────────────────────
  ipcMain.handle(IPC.PROCESS_START, async (_event, serviceId: string) => {
    await processManager.startService(serviceId)
  })

  ipcMain.handle(IPC.PROCESS_STOP, async (_event, serviceId: string) => {
    await processManager.stopService(serviceId)
  })

  ipcMain.handle(IPC.PROCESS_RESTART, async (_event, serviceId: string) => {
    await processManager.restartService(serviceId)
  })

  ipcMain.handle(IPC.PROCESS_START_ALL, async () => {
    await processManager.startAll()
  })

  ipcMain.handle(IPC.PROCESS_STOP_ALL, async () => {
    await processManager.stopAll()
  })

  // ── Terminal ──────────────────────────────────────────
  ipcMain.on(IPC.TERMINAL_INPUT, (_event, { serviceId, data }: { serviceId: string; data: string }) => {
    processManager.writeInput(serviceId, data)
  })

  ipcMain.on(IPC.TERMINAL_RESIZE, (_event, { serviceId, cols, rows }: { serviceId: string; cols: number; rows: number }) => {
    processManager.resizeTerminal(serviceId, cols, rows)
  })

  ipcMain.handle(IPC.TERMINAL_GET_BUFFER, (_event, serviceId: string) => {
    return processManager.getBuffer(serviceId)
  })

  // ── App settings ──────────────────────────────────────
  ipcMain.handle(IPC.APP_GET_SETTINGS, () => {
    return {
      recentProjects: appStore.get('recentProjects', []),
      windowBounds: appStore.get('windowBounds'),
      terminalPanelHeight: appStore.get('terminalPanelHeight', 300),
      sidebarWidth: appStore.get('sidebarWidth', 320)
    } as AppSettings
  })

  ipcMain.handle(IPC.APP_SAVE_SETTINGS, (_event, settings: Partial<AppSettings>) => {
    for (const [key, value] of Object.entries(settings)) {
      appStore.set(key as keyof AppSettings, value)
    }
  })

  ipcMain.handle(IPC.APP_GET_RECENT_PROJECTS, () => {
    return appStore.get('recentProjects', [])
  })
}

function startConfigWatcher(projectPath: string): void {
  const window = BrowserWindow.getFocusedWindow()
  if (!window) return

  configLoader.watch(
    projectPath,
    (updatedConfig) => {
      processManager.setConfigs(updatedConfig.services)
      window.webContents.send(IPC.CONFIG_CHANGED, updatedConfig)
    },
    (error) => {
      window.webContents.send(IPC.CONFIG_ERROR, error.message)
    }
  )
}

function addRecentProject(path: string, name: string): void {
  const recent = appStore.get('recentProjects', []) as RecentProject[]
  const filtered = recent.filter((p) => p.path !== path)
  filtered.unshift({ path, name, lastOpened: Date.now() })
  appStore.set('recentProjects', filtered.slice(0, 10))
}

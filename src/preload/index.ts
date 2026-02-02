import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { AppSettings, ProjectDocsData } from '@shared/types'

const api = {
  // Project
  openProject: (): Promise<string | null> => ipcRenderer.invoke(IPC.PROJECT_OPEN),
  openRecentProject: (path: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROJECT_OPEN_RECENT, path),

  // Config
  loadConfig: (projectPath: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC.CONFIG_LOAD, projectPath),
  generateConfig: (projectPath: string): Promise<{ yaml: string; config: unknown; detectedFiles: string[] }> =>
    ipcRenderer.invoke(IPC.CONFIG_GENERATE, projectPath),
  saveGeneratedConfig: (projectPath: string, yamlContent: string): Promise<void> =>
    ipcRenderer.invoke(IPC.CONFIG_SAVE, projectPath, yamlContent),
  onConfigChanged: (callback: (config: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, config: unknown): void => callback(config)
    ipcRenderer.on(IPC.CONFIG_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.CONFIG_CHANGED, handler)
  },
  onConfigError: (callback: (error: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string): void => callback(error)
    ipcRenderer.on(IPC.CONFIG_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC.CONFIG_ERROR, handler)
  },

  // Process management
  startService: (serviceId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROCESS_START, serviceId),
  stopService: (serviceId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROCESS_STOP, serviceId),
  restartService: (serviceId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.PROCESS_RESTART, serviceId),
  startAll: (): Promise<void> => ipcRenderer.invoke(IPC.PROCESS_START_ALL),
  stopAll: (): Promise<void> => ipcRenderer.invoke(IPC.PROCESS_STOP_ALL),

  // Status events
  onServiceStatusChanged: (
    callback: (data: { serviceId: string; status: string; pid?: number }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { serviceId: string; status: string; pid?: number }
    ): void => callback(data)
    ipcRenderer.on(IPC.SERVICE_STATUS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.SERVICE_STATUS_CHANGED, handler)
  },
  onServiceExit: (
    callback: (data: { serviceId: string; exitCode: number | null }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { serviceId: string; exitCode: number | null }
    ): void => callback(data)
    ipcRenderer.on(IPC.SERVICE_EXIT, handler)
    return () => ipcRenderer.removeListener(IPC.SERVICE_EXIT, handler)
  },

  // Terminal
  onTerminalData: (callback: (data: { serviceId: string; data: string }) => void): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { serviceId: string; data: string }
    ): void => callback(data)
    ipcRenderer.on(IPC.TERMINAL_DATA, handler)
    return () => ipcRenderer.removeListener(IPC.TERMINAL_DATA, handler)
  },
  sendTerminalInput: (serviceId: string, data: string): void => {
    ipcRenderer.send(IPC.TERMINAL_INPUT, { serviceId, data })
  },
  resizeTerminal: (serviceId: string, cols: number, rows: number): void => {
    ipcRenderer.send(IPC.TERMINAL_RESIZE, { serviceId, cols, rows })
  },
  getTerminalBuffer: (serviceId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.TERMINAL_GET_BUFFER, serviceId),

  // Health checks
  onHealthCheckResult: (
    callback: (data: { serviceId: string; healthy: boolean; output?: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { serviceId: string; healthy: boolean; output?: string }
    ): void => callback(data)
    ipcRenderer.on(IPC.HEALTH_CHECK_RESULT, handler)
    return () => ipcRenderer.removeListener(IPC.HEALTH_CHECK_RESULT, handler)
  },

  // App settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.APP_GET_SETTINGS),
  saveSettings: (settings: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.APP_SAVE_SETTINGS, settings),
  getRecentProjects: (): Promise<Array<{ path: string; name: string; lastOpened: number }>> =>
    ipcRenderer.invoke(IPC.APP_GET_RECENT_PROJECTS),

  // Docs panel
  getProjectDocs: (projectPath: string): Promise<ProjectDocsData> =>
    ipcRenderer.invoke(IPC.DOCS_GET_PROJECT_DOCS, projectPath),
  runDocsCommand: (commandId: string, command: string, cwd: string, projectPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOCS_RUN_COMMAND, commandId, command, cwd, projectPath),
  stopDocsCommand: (commandId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOCS_COMMAND_STOP, commandId),
  sendDocsCommandInput: (commandId: string, data: string): void => {
    ipcRenderer.send(IPC.DOCS_COMMAND_INPUT, { commandId, data })
  },
  resizeDocsCommand: (commandId: string, cols: number, rows: number): void => {
    ipcRenderer.send(IPC.DOCS_COMMAND_RESIZE, { commandId, cols, rows })
  },
  onDocsCommandOutput: (
    callback: (data: { commandId: string; data: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { commandId: string; data: string }
    ): void => callback(data)
    ipcRenderer.on(IPC.DOCS_COMMAND_OUTPUT, handler)
    return () => ipcRenderer.removeListener(IPC.DOCS_COMMAND_OUTPUT, handler)
  },
  onDocsCommandExit: (
    callback: (data: { commandId: string; exitCode: number }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { commandId: string; exitCode: number }
    ): void => callback(data)
    ipcRenderer.on(IPC.DOCS_COMMAND_EXIT, handler)
    return () => ipcRenderer.removeListener(IPC.DOCS_COMMAND_EXIT, handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api

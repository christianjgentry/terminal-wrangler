import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { ServiceConfig, ServiceStatus } from '@shared/types'
import { ServiceProcess } from './service-process'
import { HealthChecker } from './health-checker'
import type { ProcessEvents } from './types'

export class ProcessManager {
  private processes = new Map<string, ServiceProcess>()
  private configs = new Map<string, ServiceConfig>()
  private healthChecker: HealthChecker

  constructor() {
    this.healthChecker = new HealthChecker({
      onHealthy: (serviceId, output) => {
        const process = this.processes.get(serviceId)
        if (process) {
          process.setRunning()
        }
        this.sendToRenderer(IPC.HEALTH_CHECK_RESULT, {
          serviceId,
          healthy: true,
          output
        })
      },
      onUnhealthy: (serviceId, output) => {
        const process = this.processes.get(serviceId)
        if (process) {
          process.setError()
        }
        this.sendToRenderer(IPC.HEALTH_CHECK_RESULT, {
          serviceId,
          healthy: false,
          output
        })
      }
    })
  }

  setConfigs(configs: Record<string, ServiceConfig>): void {
    this.configs.clear()
    for (const [id, config] of Object.entries(configs)) {
      this.configs.set(id, config)
    }
  }

  async startService(serviceId: string): Promise<void> {
    const config = this.configs.get(serviceId)
    if (!config) throw new Error(`Unknown service: ${serviceId}`)

    // Start dependencies first
    for (const depId of config.dependsOn) {
      const depProcess = this.processes.get(depId)
      if (!depProcess || depProcess.status === 'idle' || depProcess.status === 'stopped') {
        await this.startService(depId)
      }
    }

    let process = this.processes.get(serviceId)
    if (process && (process.status === 'running' || process.status === 'starting')) {
      return
    }

    const events: ProcessEvents = {
      onStatusChange: (id, status, pid) => {
        this.sendToRenderer(IPC.SERVICE_STATUS_CHANGED, { serviceId: id, status, pid })
      },
      onData: (id, data) => {
        this.sendToRenderer(IPC.TERMINAL_DATA, { serviceId: id, data })
      },
      onExit: (id, exitCode) => {
        this.healthChecker.stopChecking(id)
        this.sendToRenderer(IPC.SERVICE_EXIT, { serviceId: id, exitCode })
      }
    }

    process = new ServiceProcess(config, events)
    this.processes.set(serviceId, process)
    await process.start()

    // Start health checking if configured
    if (config.healthCheck) {
      this.healthChecker.startChecking(serviceId, config.healthCheck, config.workingDirectory)
    }
  }

  async stopService(serviceId: string): Promise<void> {
    const process = this.processes.get(serviceId)
    if (!process) return

    this.healthChecker.stopChecking(serviceId)
    await process.stop()
  }

  async restartService(serviceId: string): Promise<void> {
    await this.stopService(serviceId)
    await this.startService(serviceId)
  }

  async startAll(): Promise<void> {
    const order = this.topologicalSort()
    for (const serviceId of order) {
      await this.startService(serviceId)
    }
  }

  async stopAll(): Promise<void> {
    const order = this.topologicalSort().reverse()
    await Promise.all(order.map((id) => this.stopService(id)))
  }

  getBuffer(serviceId: string): string {
    return this.processes.get(serviceId)?.getOutputBuffer() || ''
  }

  writeInput(serviceId: string, data: string): void {
    this.processes.get(serviceId)?.write(data)
  }

  resizeTerminal(serviceId: string, cols: number, rows: number): void {
    this.processes.get(serviceId)?.resize(cols, rows)
  }

  private topologicalSort(): string[] {
    const result: string[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (id: string): void => {
      if (visited.has(id)) return
      if (visiting.has(id)) return // Skip cycles (already validated in config)

      visiting.add(id)
      const config = this.configs.get(id)
      if (config) {
        for (const dep of config.dependsOn) {
          visit(dep)
        }
      }
      visiting.delete(id)
      visited.add(id)
      result.push(id)
    }

    for (const id of this.configs.keys()) {
      visit(id)
    }

    return result
  }

  private sendToRenderer(channel: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    }
  }
}

export const processManager = new ProcessManager()

import { useEffect } from 'react'
import { useServiceStore } from '../stores/service-store'
import { useAppStore } from '../stores/app-store'
import { useDocsStore } from '../stores/docs-store'
import type { ServiceStatus, ProjectConfig } from '@shared/types'

export function useIpcListeners(): void {
  useEffect(() => {
    const unsubStatus = window.api.onServiceStatusChanged(
      (data: { serviceId: string; status: string; pid?: number }) => {
        useServiceStore.getState().updateStatus(data.serviceId, data.status as ServiceStatus, data.pid)
        if (data.status === 'starting') {
          useAppStore.getState().setTerminalPanelOpen(true)
          useAppStore.getState().setActiveTerminalTab(data.serviceId)
        }
      }
    )

    const unsubExit = window.api.onServiceExit(
      (data: { serviceId: string; exitCode: number | null }) => {
        useServiceStore.getState().updateExitCode(data.serviceId, data.exitCode)
      }
    )

    const unsubHealth = window.api.onHealthCheckResult(
      (data: { serviceId: string; healthy: boolean }) => {
        useServiceStore.getState().updateHealthCheck(data.serviceId, data.healthy)
      }
    )

    const unsubConfigChanged = window.api.onConfigChanged(
      (config: ProjectConfig) => {
        useAppStore.getState().setProjectName(config.project.name)
        useServiceStore.getState().setServices(config.services)
      }
    )

    const unsubConfigError = window.api.onConfigError(
      (error: string) => {
        useAppStore.getState().setConfigError(error)
      }
    )

    const unsubDocsExit = window.api.onDocsCommandExit(
      (data: { commandId: string; exitCode: number }) => {
        useDocsStore.getState().removeRunningCommand(data.commandId)
      }
    )

    return () => {
      unsubStatus()
      unsubExit()
      unsubHealth()
      unsubConfigChanged()
      unsubConfigError()
      unsubDocsExit()
    }
  }, [])
}

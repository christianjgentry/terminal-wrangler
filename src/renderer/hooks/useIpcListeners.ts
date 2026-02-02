import { useEffect } from 'react'
import { useServiceStore } from '../stores/service-store'
import { useAppStore } from '../stores/app-store'
import { useDocsStore } from '../stores/docs-store'
import type { ServiceStatus, ServiceConfig } from '@shared/types'

export function useIpcListeners(): void {
  const updateStatus = useServiceStore((s) => s.updateStatus)
  const updateExitCode = useServiceStore((s) => s.updateExitCode)
  const updateHealthCheck = useServiceStore((s) => s.updateHealthCheck)
  const setServices = useServiceStore((s) => s.setServices)
  const setProjectName = useAppStore((s) => s.setProjectName)
  const setConfigError = useAppStore((s) => s.setConfigError)
  const removeRunningCommand = useDocsStore((s) => s.removeRunningCommand)

  useEffect(() => {
    const unsubStatus = window.api.onServiceStatusChanged(
      (data: { serviceId: string; status: string; pid?: number }) => {
        updateStatus(data.serviceId, data.status as ServiceStatus, data.pid)
      }
    )

    const unsubExit = window.api.onServiceExit(
      (data: { serviceId: string; exitCode: number | null }) => {
        updateExitCode(data.serviceId, data.exitCode)
      }
    )

    const unsubHealth = window.api.onHealthCheckResult(
      (data: { serviceId: string; healthy: boolean }) => {
        updateHealthCheck(data.serviceId, data.healthy)
      }
    )

    const unsubConfigChanged = window.api.onConfigChanged(
      (config: unknown) => {
        const cfg = config as {
          project: { name: string }
          services: Record<string, ServiceConfig>
        }
        setProjectName(cfg.project.name)
        setServices(cfg.services)
      }
    )

    const unsubConfigError = window.api.onConfigError(
      (error: string) => {
        setConfigError(error)
      }
    )

    const unsubDocsExit = window.api.onDocsCommandExit(
      (data: { commandId: string; exitCode: number }) => {
        removeRunningCommand(data.commandId)
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
  }, [updateStatus, updateExitCode, updateHealthCheck, setServices, setProjectName, setConfigError, removeRunningCommand])
}

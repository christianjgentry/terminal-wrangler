import { create } from 'zustand'
import type { ServiceConfig, ServiceStatus } from '@shared/types'

export interface ServiceEntry {
  config: ServiceConfig
  status: ServiceStatus
  pid?: number
  exitCode?: number | null
  healthCheckPassing: boolean
}

interface ServiceState {
  services: Record<string, ServiceEntry>

  setServices: (configs: Record<string, ServiceConfig>) => void
  updateStatus: (serviceId: string, status: ServiceStatus, pid?: number) => void
  updateExitCode: (serviceId: string, exitCode: number | null) => void
  updateHealthCheck: (serviceId: string, passing: boolean) => void
  clearAll: () => void
}

export const useServiceStore = create<ServiceState>((set) => ({
  services: {},

  setServices: (configs) =>
    set({
      services: Object.fromEntries(
        Object.entries(configs).map(([id, config]) => [
          id,
          {
            config,
            status: 'idle' as ServiceStatus,
            healthCheckPassing: false
          }
        ])
      )
    }),

  updateStatus: (serviceId, status, pid) =>
    set((state) => {
      const service = state.services[serviceId]
      if (!service) return state
      return {
        services: {
          ...state.services,
          [serviceId]: { ...service, status, pid: pid ?? service.pid }
        }
      }
    }),

  updateExitCode: (serviceId, exitCode) =>
    set((state) => {
      const service = state.services[serviceId]
      if (!service) return state
      return {
        services: {
          ...state.services,
          [serviceId]: { ...service, exitCode }
        }
      }
    }),

  updateHealthCheck: (serviceId, passing) =>
    set((state) => {
      const service = state.services[serviceId]
      if (!service) return state
      return {
        services: {
          ...state.services,
          [serviceId]: { ...service, healthCheckPassing: passing }
        }
      }
    }),

  clearAll: () => set({ services: {} })
}))

import type { ServiceStatus } from '@shared/types'

export interface ProcessEvents {
  onStatusChange: (serviceId: string, status: ServiceStatus, pid?: number) => void
  onData: (serviceId: string, data: string) => void
  onExit: (serviceId: string, exitCode: number | null) => void
}

export const OUTPUT_BUFFER_SIZE = 100 * 1024 // 100KB ring buffer

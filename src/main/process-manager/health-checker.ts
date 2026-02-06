import { exec } from 'child_process'
import type { HealthCheckConfig } from '@shared/types'
import { createLogger } from '../lib/logger'

const logger = createLogger('HealthChecker')

interface HealthCheckCallbacks {
  onHealthy: (serviceId: string, output: string) => void
  onUnhealthy: (serviceId: string, output: string) => void
}

interface HealthCheckState {
  initialTimeout: NodeJS.Timeout | null
  timer: NodeJS.Timeout | null
  failureCount: number
  isHealthy: boolean
}

export class HealthChecker {
  private checks = new Map<string, HealthCheckState>()
  private callbacks: HealthCheckCallbacks

  constructor(callbacks: HealthCheckCallbacks) {
    this.callbacks = callbacks
  }

  startChecking(
    serviceId: string,
    config: HealthCheckConfig,
    workingDirectory: string
  ): void {
    this.stopChecking(serviceId)

    const state: HealthCheckState = {
      initialTimeout: null,
      timer: null,
      failureCount: 0,
      isHealthy: false
    }

    this.checks.set(serviceId, state)

    const runCheck = (): void => {
      try {
        exec(
          config.command,
          {
            cwd: workingDirectory,
            timeout: Math.min(config.interval - 500, 10000)
          },
          (error, stdout, stderr) => {
            const checkState = this.checks.get(serviceId)
            if (!checkState) return

            if (error) {
              checkState.failureCount++
              const output = stderr || error.message
              if (checkState.failureCount >= config.retries) {
                checkState.isHealthy = false
                this.callbacks.onUnhealthy(serviceId, output)
              }
            } else {
              checkState.failureCount = 0
              if (!checkState.isHealthy) {
                checkState.isHealthy = true
                this.callbacks.onHealthy(serviceId, stdout.trim())
              }
            }
          }
        )
      } catch (err) {
        logger.error(`Health check exec failed for ${serviceId}:`, err)
      }
    }

    // Start with delay if configured
    const delay = config.startDelay || 0
    state.initialTimeout = setTimeout(() => {
      state.initialTimeout = null
      runCheck()
      state.timer = setInterval(runCheck, config.interval)
    }, delay)
  }

  stopChecking(serviceId: string): void {
    const state = this.checks.get(serviceId)
    if (state) {
      if (state.initialTimeout) clearTimeout(state.initialTimeout)
      if (state.timer) clearInterval(state.timer)
    }
    this.checks.delete(serviceId)
  }

  stopAll(): void {
    for (const [id] of this.checks) {
      this.stopChecking(id)
    }
  }

  isHealthy(serviceId: string): boolean {
    return this.checks.get(serviceId)?.isHealthy || false
  }
}

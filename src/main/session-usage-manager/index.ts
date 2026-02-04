import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { SessionUsageData } from '@shared/session-usage-types'
import { readClaudeCredentials, refreshAccessToken } from './credentials'
import { probeUsage, validateApiKey } from './api-probe'
import { appStore } from '../store'

const POLL_INTERVAL = 60_000

export class SessionUsageManager {
  private cached: SessionUsageData | null = null
  private timer: ReturnType<typeof setInterval> | null = null

  async getUsage(): Promise<SessionUsageData | null> {
    if (this.cached) return this.cached
    return this.refresh()
  }

  async refresh(): Promise<SessionUsageData | null> {
    // Try OAuth credentials first
    const { creds, error: credsError } = await readClaudeCredentials()

    if (creds) {
      let probe = await probeUsage(creds.accessToken)

      // If 401 and we have a refresh token, force-refresh and retry once
      if (probe.error?.includes('401') && creds.refreshToken) {
        const refreshed = await refreshAccessToken(creds.refreshToken)
        if (refreshed) {
          creds.accessToken = refreshed.accessToken
          probe = await probeUsage(refreshed.accessToken)
        }
      }

      if (!probe.error) {
        const data: SessionUsageData = {
          fiveHour: probe.fiveHour,
          sevenDay: probe.sevenDay,
          sevenDaySonnet: probe.sevenDaySonnet,
          status: deriveStatus(probe.fiveHour?.utilization ?? null),
          authMode: 'oauth',
          subscriptionType: creds.subscriptionType,
          rateLimitTier: creds.rateLimitTier,
          fetchedAt: Date.now(),
          error: null
        }
        this.cached = data
        this.broadcast(data)
        return data
      }
    }

    // Fall back to API key from settings
    const apiKey = appStore.get('anthropicApiKey') as string | undefined
    if (apiKey) {
      const validation = await validateApiKey(apiKey)
      const data: SessionUsageData = {
        fiveHour: null,
        sevenDay: null,
        sevenDaySonnet: null,
        status: validation.valid ? 'normal' : 'unknown',
        authMode: 'api-key',
        subscriptionType: 'api-key',
        rateLimitTier: null,
        fetchedAt: Date.now(),
        error: validation.error
      }
      this.cached = data
      this.broadcast(data)
      return data
    }

    // Neither method available
    const data: SessionUsageData = {
      fiveHour: null,
      sevenDay: null,
      sevenDaySonnet: null,
      status: 'unknown',
      authMode: 'none',
      subscriptionType: null,
      rateLimitTier: null,
      fetchedAt: Date.now(),
      error: credsError ?? 'No credentials or API key configured'
    }
    this.cached = data
    this.broadcast(data)
    return data
  }

  startPolling(): void {
    if (this.timer) return
    setTimeout(() => this.refresh(), 2_000)
    this.timer = setInterval(() => this.refresh(), POLL_INTERVAL)
  }

  stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private broadcast(data: SessionUsageData | null): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.SESSION_USAGE_CHANGED, data)
      }
    }
  }
}

function deriveStatus(utilization: number | null): SessionUsageData['status'] {
  if (utilization === null) return 'unknown'
  if (utilization >= 100) return 'exceeded'
  if (utilization >= 80) return 'approaching'
  return 'normal'
}

export const sessionUsageManager = new SessionUsageManager()

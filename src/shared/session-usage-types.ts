export type RateLimitStatus = 'normal' | 'approaching' | 'exceeded' | 'unknown'

export interface RateLimitWindow {
  utilization: number // 0-100 percentage
  resetAt: string // ISO timestamp
}

export interface SessionUsageData {
  fiveHour: RateLimitWindow | null
  sevenDay: RateLimitWindow | null
  sevenDaySonnet: RateLimitWindow | null
  status: RateLimitStatus
  authMode: 'oauth' | 'api-key' | 'none'
  subscriptionType: string | null
  rateLimitTier: string | null
  fetchedAt: number // Date.now()
  error: string | null
}

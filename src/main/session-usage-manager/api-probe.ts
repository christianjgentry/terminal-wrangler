import https from 'https'
import type { IncomingHttpHeaders } from 'http'
import type { RateLimitWindow, ApiKeyRateLimits, ApiKeyRateLimitDimension } from '@shared/session-usage-types'

export interface ProbeResult {
  fiveHour: RateLimitWindow | null
  sevenDay: RateLimitWindow | null
  sevenDaySonnet: RateLimitWindow | null
  error: string | null
}

export interface ApiKeyValidation {
  valid: boolean
  error: string | null
  rateLimits: ApiKeyRateLimits | null
}

export function probeUsage(accessToken: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/api/oauth/usage',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 10_000
      },
      (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk.toString() })
        res.on('end', () => {
          const httpStatus = res.statusCode ?? 0

          if (httpStatus === 401) {
            resolve({ fiveHour: null, sevenDay: null, sevenDaySonnet: null, error: 'Authentication failed (401) — token may be expired' })
            return
          }

          if (httpStatus === 403) {
            resolve({ fiveHour: null, sevenDay: null, sevenDaySonnet: null, error: 'Access forbidden (403)' })
            return
          }

          if (httpStatus >= 400) {
            let msg = `API error (${httpStatus})`
            try {
              const parsed = JSON.parse(body)
              if (parsed?.error?.message) msg = parsed.error.message
            } catch { /* use default */ }
            resolve({ fiveHour: null, sevenDay: null, sevenDaySonnet: null, error: msg })
            return
          }

          try {
            const data = JSON.parse(body)
            resolve({
              fiveHour: parseWindow(data.five_hour),
              sevenDay: parseWindow(data.seven_day),
              sevenDaySonnet: parseWindow(data.seven_day_sonnet),
              error: null
            })
          } catch {
            resolve({ fiveHour: null, sevenDay: null, sevenDaySonnet: null, error: 'Failed to parse usage response' })
          }
        })
      }
    )

    req.on('error', (err) => {
      resolve({ fiveHour: null, sevenDay: null, sevenDaySonnet: null, error: `Network error: ${err.message}` })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ fiveHour: null, sevenDay: null, sevenDaySonnet: null, error: 'Request timed out' })
    })

    req.end()
  })
}

/**
 * Validate an API key using GET /v1/models — a read-only endpoint
 * that doesn't consume message credits or rate limit budget.
 */
export function validateApiKey(apiKey: string): Promise<ApiKeyValidation> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/models',
        method: 'GET',
        headers: {
          'anthropic-version': '2023-06-01',
          'x-api-key': apiKey
        },
        timeout: 10_000
      },
      (res) => {
        res.resume()
        const httpStatus = res.statusCode ?? 0

        if (httpStatus === 401) {
          resolve({ valid: false, error: 'Invalid API key (401)', rateLimits: null })
          return
        }

        if (httpStatus === 403) {
          resolve({ valid: false, error: 'Access forbidden (403)', rateLimits: null })
          return
        }

        if (httpStatus >= 400) {
          resolve({ valid: false, error: `API error (${httpStatus})`, rateLimits: null })
          return
        }

        resolve({ valid: true, error: null, rateLimits: parseRateLimitHeaders(res.headers) })
      }
    )

    req.on('error', (err) => {
      resolve({ valid: false, error: `Network error: ${err.message}`, rateLimits: null })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ valid: false, error: 'Request timed out', rateLimits: null })
    })

    req.end()
  })
}

function parseDimension(headers: IncomingHttpHeaders, prefix: string): ApiKeyRateLimitDimension | null {
  const limitStr = headers[`${prefix}-limit`]
  const remainStr = headers[`${prefix}-remaining`]
  const resetStr = headers[`${prefix}-reset`]

  if (!limitStr || !remainStr || !resetStr) return null

  const limit = Number(limitStr)
  const remaining = Number(remainStr)

  if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(remaining)) return null

  return {
    limit,
    remaining,
    resetAt: String(resetStr),
    utilization: Math.round(((limit - remaining) / limit) * 100)
  }
}

function parseRateLimitHeaders(headers: IncomingHttpHeaders): ApiKeyRateLimits | null {
  const requests = parseDimension(headers, 'anthropic-ratelimit-requests')
  const tokens = parseDimension(headers, 'anthropic-ratelimit-tokens')
  const inputTokens = parseDimension(headers, 'anthropic-ratelimit-input-tokens')
  const outputTokens = parseDimension(headers, 'anthropic-ratelimit-output-tokens')

  if (!requests && !tokens && !inputTokens && !outputTokens) return null

  return { requests, tokens, inputTokens, outputTokens }
}

function parseWindow(
  raw: { utilization: number | null; resets_at: string | null } | null | undefined
): RateLimitWindow | null {
  if (!raw || raw.utilization === null || raw.utilization === undefined) return null
  return {
    utilization: raw.utilization,
    resetAt: raw.resets_at ?? ''
  }
}

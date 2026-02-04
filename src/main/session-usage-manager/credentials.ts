import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import https from 'https'

export interface ClaudeCredentials {
  accessToken: string
  refreshToken: string | null
  subscriptionType: string | null
  rateLimitTier: string | null
  expiresAt: number | null
}

const CREDENTIALS_PATH = join(homedir(), '.claude', '.credentials.json')
const TOKEN_URL = 'https://platform.claude.com/v1/oauth/token'
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e'
const SCOPES = 'user:profile user:inference user:sessions:claude_code user:mcp_servers'

export async function readClaudeCredentials(): Promise<{ creds: ClaudeCredentials | null; error: string | null }> {
  let data: Record<string, unknown>
  try {
    const raw = await readFile(CREDENTIALS_PATH, 'utf-8')
    data = JSON.parse(raw)
  } catch {
    return { creds: null, error: 'Credentials file not found (~/.claude/.credentials.json)' }
  }

  const oauth = data.claudeAiOauth as Record<string, unknown> | undefined
  if (!oauth?.accessToken) {
    return { creds: null, error: 'No access token in credentials' }
  }

  const expiresAt: number | null = typeof oauth.expiresAt === 'number' ? oauth.expiresAt : null
  const refreshToken = typeof oauth.refreshToken === 'string' ? oauth.refreshToken : null
  const isExpired = expiresAt !== null && expiresAt < Date.now()

  // If expired, attempt to refresh
  if (isExpired) {
    if (!refreshToken) {
      return { creds: null, error: 'Token expired and no refresh token available' }
    }

    const refreshResult = await refreshAccessToken(refreshToken)
    if (!refreshResult) {
      return { creds: null, error: 'Token expired — refresh failed. Run "claude" in terminal to re-authenticate.' }
    }

    return {
      creds: {
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken,
        subscriptionType: (oauth.subscriptionType as string) ?? null,
        rateLimitTier: (oauth.rateLimitTier as string) ?? null,
        expiresAt: refreshResult.expiresAt
      },
      error: null
    }
  }

  return {
    creds: {
      accessToken: oauth.accessToken as string,
      refreshToken,
      subscriptionType: (oauth.subscriptionType as string) ?? null,
      rateLimitTier: (oauth.rateLimitTier as string) ?? null,
      expiresAt
    },
    error: null
  }
}

export interface RefreshResult {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult | null> {
  const tokenData = await requestTokenRefresh(refreshToken)
  if (!tokenData) return null

  // Update credentials file on disk
  try {
    const raw = await readFile(CREDENTIALS_PATH, 'utf-8')
    const data = JSON.parse(raw)

    data.claudeAiOauth.accessToken = tokenData.access_token
    if (tokenData.refresh_token) {
      data.claudeAiOauth.refreshToken = tokenData.refresh_token
    }
    data.claudeAiOauth.expiresAt = Date.now() + tokenData.expires_in * 1000

    await writeFile(CREDENTIALS_PATH, JSON.stringify(data), 'utf-8')

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? refreshToken,
      expiresAt: data.claudeAiOauth.expiresAt
    }
  } catch {
    // Token was refreshed but couldn't persist — still usable for this session
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? refreshToken,
      expiresAt: Date.now() + tokenData.expires_in * 1000
    }
  }
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

function requestTokenRefresh(refreshToken: string): Promise<TokenResponse | null> {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      scope: SCOPES
    })

    const url = new URL(TOKEN_URL)

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 10_000
      },
      (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => { data += chunk.toString() })
        res.on('end', () => {
          if (res.statusCode !== 200) {
            resolve(null)
            return
          }
          try {
            resolve(JSON.parse(data) as TokenResponse)
          } catch {
            resolve(null)
          }
        })
      }
    )

    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })

    req.write(body)
    req.end()
  })
}

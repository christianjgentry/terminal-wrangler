import { create } from 'zustand'
import type { GitHubProjectStatus } from '@shared/github-types'
import type { SessionUsageData } from '@shared/session-usage-types'

type AuthStatus = 'checking' | 'connected' | 'disconnected' | 'error'

export interface GitHubAuthInfo {
  status: AuthStatus
  ghAvailable: boolean
  username: string | null
  scopes: string[]
  error: string | null
}

export interface JiraAuthInfo {
  status: AuthStatus
  cloudUrl: string | null
  displayName: string | null
  error: string | null
}

export interface ClaudeAuthInfo {
  status: AuthStatus
  authMode: 'oauth' | 'none'
  subscriptionType: string | null
  rateLimitTier: string | null
  error: string | null
}

interface SettingsState {
  github: GitHubAuthInfo
  jira: JiraAuthInfo
  claude: ClaudeAuthInfo

  fetchAllAuthStatus: () => Promise<void>
  fetchGitHubStatus: () => Promise<void>
  fetchJiraStatus: () => Promise<void>
  fetchClaudeStatus: () => Promise<void>
}

const defaultGitHub: GitHubAuthInfo = {
  status: 'checking',
  ghAvailable: false,
  username: null,
  scopes: [],
  error: null
}

const defaultJira: JiraAuthInfo = {
  status: 'checking',
  cloudUrl: null,
  displayName: null,
  error: null
}

const defaultClaude: ClaudeAuthInfo = {
  status: 'checking',
  authMode: 'none',
  subscriptionType: null,
  rateLimitTier: null,
  error: null
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  github: defaultGitHub,
  jira: defaultJira,
  claude: defaultClaude,

  fetchAllAuthStatus: async () => {
    set({
      github: { ...defaultGitHub },
      jira: { ...defaultJira },
      claude: { ...defaultClaude }
    })
    await Promise.all([
      get().fetchGitHubStatus(),
      get().fetchJiraStatus(),
      get().fetchClaudeStatus()
    ])
  },

  fetchGitHubStatus: async () => {
    try {
      const result: GitHubProjectStatus = await window.api.getGithubProjectStatus()
      const auth = result.authStatus
      if (auth?.authenticated) {
        set({
          github: {
            status: 'connected',
            ghAvailable: result.ghAvailable,
            username: auth.username,
            scopes: auth.scopes,
            error: null
          }
        })
      } else {
        set({
          github: {
            status: 'disconnected',
            ghAvailable: result.ghAvailable,
            username: null,
            scopes: [],
            error: auth?.error || null
          }
        })
      }
    } catch (err) {
      set({
        github: {
          status: 'error',
          ghAvailable: false,
          username: null,
          scopes: [],
          error: err instanceof Error ? err.message : String(err)
        }
      })
    }
  },

  fetchJiraStatus: async () => {
    try {
      const creds = await window.api.getJiraCredentials()
      if (!creds) {
        set({ jira: { status: 'disconnected', cloudUrl: null, displayName: null, error: null } })
        return
      }
      const result = await window.api.testJiraConnection(creds)
      if (result.connected) {
        set({
          jira: {
            status: 'connected',
            cloudUrl: creds.cloudUrl,
            displayName: result.displayName || null,
            error: null
          }
        })
      } else {
        set({
          jira: {
            status: 'error',
            cloudUrl: creds.cloudUrl,
            displayName: null,
            error: result.error || 'Connection failed'
          }
        })
      }
    } catch (err) {
      set({
        jira: {
          status: 'error',
          cloudUrl: null,
          displayName: null,
          error: err instanceof Error ? err.message : String(err)
        }
      })
    }
  },

  fetchClaudeStatus: async () => {
    try {
      const data: SessionUsageData = await window.api.getSessionUsage()
      if (data.authMode === 'none') {
        set({
          claude: {
            status: 'disconnected',
            authMode: 'none',
            subscriptionType: null,
            rateLimitTier: null,
            error: data.error
          }
        })
      } else if (data.error) {
        set({
          claude: {
            status: 'error',
            authMode: data.authMode,
            subscriptionType: data.subscriptionType,
            rateLimitTier: data.rateLimitTier,
            error: data.error
          }
        })
      } else {
        set({
          claude: {
            status: 'connected',
            authMode: data.authMode,
            subscriptionType: data.subscriptionType,
            rateLimitTier: data.rateLimitTier,
            error: null
          }
        })
      }
    } catch (err) {
      set({
        claude: {
          status: 'error',
          authMode: 'none',
          subscriptionType: null,
          rateLimitTier: null,
          error: err instanceof Error ? err.message : String(err)
        }
      })
    }
  }
}))

import { BrowserWindow } from 'electron'
import type { JiraCredentials, JiraConnectionResult, JiraEpic, JiraStory, JiraTransition } from '@shared/jira-types'
import * as credentials from './credentials'
import * as api from './api-client'

export class JiraManager {
  private epicCache = new Map<string, JiraEpic[]>()
  private storyCache = new Map<string, JiraStory[]>()

  // ── Credentials ──────────────────────────────────

  getCredentials(): JiraCredentials | null {
    return credentials.getJiraCredentials()
  }

  setCredentials(creds: JiraCredentials): void {
    credentials.setJiraCredentials(creds)
  }

  getProjectKey(): string | null {
    return credentials.getJiraProjectKey()
  }

  setProjectKey(key: string): void {
    credentials.setJiraProjectKey(key)
  }

  // ── Connection ──────────────────────────────────

  async testConnection(creds: JiraCredentials): Promise<JiraConnectionResult> {
    return api.testJiraConnection(creds)
  }

  // ── Epics ──────────────────────────────────

  async getEpics(projectKey: string): Promise<JiraEpic[]> {
    const cached = this.epicCache.get(projectKey)
    if (cached) return cached

    return this.refreshEpics(projectKey)
  }

  async refreshEpics(projectKey: string): Promise<JiraEpic[]> {
    const creds = credentials.getJiraCredentials()
    if (!creds) return []

    const result = await api.fetchEpics(creds, projectKey)
    if (result.error || !result.data) {
      console.error('[JiraManager] fetchEpics error:', result.error)
      return []
    }

    // Attach story counts from cache where available
    const epics = result.data.map((epic) => ({
      ...epic,
      storyCount: this.storyCache.get(epic.key)?.length
    }))

    this.epicCache.set(projectKey, epics)
    return epics
  }

  // ── Stories ──────────────────────────────────

  async getStoriesByEpic(epicKey: string): Promise<JiraStory[]> {
    const cached = this.storyCache.get(epicKey)
    if (cached) return cached

    return this.refreshStoriesByEpic(epicKey)
  }

  async refreshStoriesByEpic(epicKey: string): Promise<JiraStory[]> {
    const creds = credentials.getJiraCredentials()
    if (!creds) return []

    const result = await api.fetchStoriesByEpic(creds, epicKey)
    if (result.error || !result.data) {
      console.error('[JiraManager] fetchStoriesByEpic error:', result.error)
      return []
    }

    this.storyCache.set(epicKey, result.data)
    return result.data
  }

  // ── Single issue ──────────────────────────────────

  async getIssue(issueKey: string): Promise<JiraStory | null> {
    const creds = credentials.getJiraCredentials()
    if (!creds) return null

    const result = await api.fetchIssue(creds, issueKey)
    if (result.error || !result.data) {
      console.error('[JiraManager] fetchIssue error:', result.error)
      return null
    }
    return result.data
  }

  // ── Transitions ──────────────────────────────────

  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    const creds = credentials.getJiraCredentials()
    if (!creds) return []

    const result = await api.getTransitions(creds, issueKey)
    if (result.error || !result.data) {
      console.error('[JiraManager] getTransitions error:', result.error)
      return []
    }
    return result.data
  }

  // ── Comments ──────────────────────────────────

  async addComment(issueKey: string, adfBody: unknown): Promise<boolean> {
    const creds = credentials.getJiraCredentials()
    if (!creds) return false

    const result = await api.postComment(creds, issueKey, adfBody)
    if (result.error) {
      console.error('[JiraManager] postComment error:', result.error)
      return false
    }
    return true
  }

  // ── Transitions (execute) ──────────────────────────────────

  async transitionIssue(issueKey: string, transitionId: string): Promise<boolean> {
    const creds = credentials.getJiraCredentials()
    if (!creds) return false

    const result = await api.transitionIssue(creds, issueKey, transitionId)
    if (result.error) {
      console.error('[JiraManager] transitionIssue error:', result.error)
      return false
    }
    return true
  }

  // ── Lifecycle helpers (fire-and-forget) ──────────────────

  async postLifecycleComment(issueKey: string, status: string, extra?: string): Promise<void> {
    try {
      const { buildLifecycleComment } = await import('./lifecycle')
      const adfBody = buildLifecycleComment(status, extra)
      if (adfBody) {
        await this.addComment(issueKey, adfBody)
      }
    } catch (err) {
      console.error('[JiraManager] lifecycle comment failed:', err)
    }
  }

  async tryTransition(issueKey: string, targetStatusName: string): Promise<void> {
    try {
      const transitions = await this.getTransitions(issueKey)
      const match = transitions.find(
        (t) => t.name.toLowerCase() === targetStatusName.toLowerCase()
      )
      if (match) {
        await this.transitionIssue(issueKey, match.id)
      }
    } catch (err) {
      console.error('[JiraManager] tryTransition failed:', err)
    }
  }

  // ── Broadcast ──────────────────────────────────

  private broadcast(channel: string, data: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    }
  }
}

export const jiraManager = new JiraManager()

import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { PrInfo, GhAuthStatus, GitHubProjectStatus, MergeResult } from '@shared/github-types'
import { ghExec, isGhAvailable } from './gh-cli'
import { detectGitRemote } from './git-remote'

const POLL_INTERVAL = 60_000 // Poll every 60 seconds instead of 30 to reduce API calls

interface PollingEntry {
  agentId: string
  prUrl: string
  timer: ReturnType<typeof setInterval>
}

export class GitHubManager {
  private polling = new Map<string, PollingEntry>()
  onPrMerged: ((agentId: string) => void) | null = null

  async getAuthStatus(): Promise<GhAuthStatus> {
    const result = await ghExec(['auth', 'status', '--show-token'])
    // gh auth status outputs to stderr
    const output = result.stderr + result.stdout
    if (result.exitCode !== 0) {
      return { authenticated: false, username: null, scopes: [], error: output.trim() }
    }

    const usernameMatch = output.match(/Logged in to github\.com account\s+(\S+)/)
      ?? output.match(/Logged in to github\.com as\s+(\S+)/)
    const scopesMatch = output.match(/Token scopes:\s*(.+)/)
    const scopes = scopesMatch
      ? scopesMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
      : []

    return {
      authenticated: true,
      username: usernameMatch?.[1] ?? null,
      scopes,
      error: null
    }
  }

  async getRemote(cwd: string): Promise<import('@shared/github-types').GitRemoteInfo | null> {
    return detectGitRemote(cwd)
  }

  async getProjectStatus(cwd: string): Promise<GitHubProjectStatus> {
    const [ghAvailable, authStatus, remote] = await Promise.all([
      isGhAvailable(),
      this.getAuthStatus(),
      detectGitRemote(cwd)
    ])
    return { ghAvailable, authStatus, remote }
  }

  async getPrInfo(prUrl: string): Promise<PrInfo | null> {
    const result = await ghExec([
      'pr', 'view', prUrl,
      '--json', 'number,title,url,state,mergeable,reviewDecision,headRefName,updatedAt,statusCheckRollup'
    ])

    if (result.exitCode !== 0) return null

    try {
      const data = JSON.parse(result.stdout)
      return {
        number: data.number,
        title: data.title,
        url: data.url,
        state: data.state,
        mergeable: data.mergeable ?? 'UNKNOWN',
        reviewDecision: data.reviewDecision || null,
        checksStatus: aggregateChecks(data.statusCheckRollup),
        headRefName: data.headRefName,
        updatedAt: data.updatedAt,
        lastFetchedAt: Date.now()
      }
    } catch {
      return null
    }
  }

  async listPrs(cwd: string): Promise<PrInfo[]> {
    const result = await ghExec(
      ['pr', 'list', '--json', 'number,title,url,state,mergeable,reviewDecision,headRefName,updatedAt,statusCheckRollup', '--limit', '20'],
      cwd
    )

    if (result.exitCode !== 0) return []

    try {
      const items = JSON.parse(result.stdout)
      return items.map((data: Record<string, unknown>) => ({
        number: data.number as number,
        title: data.title as string,
        url: data.url as string,
        state: data.state as string,
        mergeable: (data.mergeable as string) ?? 'UNKNOWN',
        reviewDecision: (data.reviewDecision as string) || null,
        checksStatus: aggregateChecks(data.statusCheckRollup as CheckNode[] | undefined),
        headRefName: data.headRefName as string,
        updatedAt: data.updatedAt as string,
        lastFetchedAt: Date.now()
      })) as PrInfo[]
    } catch {
      return []
    }
  }

  async mergePr(prUrl: string): Promise<MergeResult> {
    // Retry up to 3 times with delay for rate limiting
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await ghExec(['pr', 'merge', prUrl, '--squash', '--delete-branch'])
      if (result.exitCode === 0) {
        return { success: true }
      }
      const error = result.stderr.trim()
      // If rate limited, wait and retry
      if (error.includes('429') || error.includes('throttl')) {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 5000 * attempt)) // 5s, 10s delays
          continue
        }
      }
      return { success: false, error: error || 'Merge failed' }
    }
    return { success: false, error: 'Merge failed after retries' }
  }

  async closePr(prUrl: string): Promise<MergeResult> {
    // Retry up to 3 times with delay for rate limiting
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await ghExec(['pr', 'close', prUrl, '--delete-branch'])
      if (result.exitCode === 0) {
        return { success: true }
      }
      const error = result.stderr.trim()
      // If rate limited, wait and retry
      if (error.includes('429') || error.includes('throttl')) {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 5000 * attempt)) // 5s, 10s delays
          continue
        }
      }
      return { success: false, error: error || 'Failed to close PR' }
    }
    return { success: false, error: 'Close failed after retries' }
  }

  async getPrDiff(prUrl: string): Promise<string | null> {
    const result = await ghExec(['pr', 'diff', prUrl])
    if (result.exitCode !== 0) return null
    return result.stdout
  }

  startPolling(agentId: string, prUrl: string): void {
    // Stop existing poll for this agent if any
    this.stopPolling(agentId)

    // Immediate fetch
    this.fetchAndBroadcast(agentId, prUrl)

    const timer = setInterval(() => {
      this.fetchAndBroadcast(agentId, prUrl)
    }, POLL_INTERVAL)

    this.polling.set(agentId, { agentId, prUrl, timer })
  }

  stopPolling(agentId: string): void {
    const entry = this.polling.get(agentId)
    if (entry) {
      clearInterval(entry.timer)
      this.polling.delete(agentId)
    }
  }

  stopAllPolling(): void {
    for (const entry of this.polling.values()) {
      clearInterval(entry.timer)
    }
    this.polling.clear()
  }

  getTrackedPrCount(): number {
    return this.polling.size
  }

  private async fetchAndBroadcast(agentId: string, prUrl: string): Promise<void> {
    const prInfo = await this.getPrInfo(prUrl)
    if (!prInfo) return

    this.broadcast(IPC.GITHUB_PR_INFO_UPDATED, { agentId, prInfo })

    if (prInfo.state === 'MERGED') {
      this.stopPolling(agentId)
      this.onPrMerged?.(agentId)
    }
  }

  private broadcast(channel: string, data: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    }
  }
}

interface CheckNode {
  conclusion?: string
  status?: string
  state?: string
}

function aggregateChecks(rollup: CheckNode[] | null | undefined): PrInfo['checksStatus'] {
  if (!rollup || rollup.length === 0) return 'UNKNOWN'

  let hasPending = false
  for (const check of rollup) {
    const conclusion = check.conclusion?.toUpperCase()
    const status = check.status?.toUpperCase()
    const state = check.state?.toUpperCase()

    if (conclusion === 'FAILURE' || conclusion === 'TIMED_OUT' || conclusion === 'CANCELLED' || state === 'FAILURE' || state === 'ERROR') {
      return 'FAILING'
    }
    if (status === 'IN_PROGRESS' || status === 'QUEUED' || status === 'PENDING' || state === 'PENDING' || !conclusion) {
      hasPending = true
    }
  }

  return hasPending ? 'PENDING' : 'PASSING'
}

export const githubManager = new GitHubManager()

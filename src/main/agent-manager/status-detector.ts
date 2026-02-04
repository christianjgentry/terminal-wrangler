import type { AgentStatus } from '@shared/agent-types'
import { cleanTerminalOutput } from '@shared/strip-ansi'

interface StatusDetectorEvents {
  onStatusChange: (status: AgentStatus) => void
  onSubagentDetected: (taskDescription: string) => void
  onPrDetected: (prUrl: string) => void
  onContextUsageChanged: (used: number, max: number) => void
}

const CONTEXT_BUFFER_SIZE = 10 * 1024 // 10KB rolling context
const RECENT_WINDOW = 1500 // chars to check for pattern matching
const EXTENDED_WINDOW = 3000 // larger window for building detection when in planning
const DEBOUNCE_MS = 2000

// Forward-only status progression ranks.
// Higher rank = further along. Terminal states (done, error, stopped) always apply.
const STATUS_RANK: Record<AgentStatus, number> = {
  idle: 0,
  planning: 1,
  building: 2,
  pr_ready: 3,
  done: 4,
  error: 4,
  stopped: 4
}

const TERMINAL_STATUSES: Set<AgentStatus> = new Set(['done', 'error', 'stopped'])

// --- Pattern helpers ---

function matchesBuilding(text: string): boolean {
  return (
    // Tool invocations: "Write(" or "Write src/..."
    /\b(?:Write|Edit|MultiEdit)[\s(]/.test(text) ||
    // Past-tense tool results
    /\b(?:Wrote to|Updated|Created|Edited|Modified)\s/.test(text) ||
    // Bash tool
    /\bBash[\s(]/.test(text) ||
    // Package manager commands
    /\b(?:npm|yarn|pnpm)\s+(?:install|run|test|build)\b/.test(text) ||
    // Git operations
    /\bgit\s+(?:add|commit|push)\b/.test(text) ||
    // Test runners
    /\b(?:Running|Ran)\b.*\btest/i.test(text) ||
    /\b(?:pytest|jest|vitest|mocha|cargo\s+test)\b/.test(text) ||
    // File creation
    /Creating file/i.test(text)
  )
}

function matchesPlanning(text: string): boolean {
  return (
    // Read/search tool invocations
    /\b(?:Read|Glob|Grep|Ls|WebSearch|WebFetch)[\s(]/.test(text) ||
    // Descriptive planning verbs
    /\b(?:Searching|Analyzing|Reading|Exploring|Examining)\b/.test(text) ||
    // Explicit plan
    /\bPlan:/i.test(text) ||
    // Thinking/reasoning indicators
    /\b(?:Thinking|Reasoning)\b/.test(text)
  )
}

export class StatusDetector {
  private contextBuffer = ''
  private currentStatus: AgentStatus = 'idle'
  private events: StatusDetectorEvents
  private debounceTimer: NodeJS.Timeout | null = null
  private pendingStatus: AgentStatus | null = null
  private detectedPrUrls = new Set<string>()
  private detectedSubagentTasks = new Set<string>()
  private lastContextUsed = -1

  constructor(events: StatusDetectorEvents) {
    this.events = events
  }

  feed(rawData: string): void {
    const cleaned = cleanTerminalOutput(rawData)
    this.contextBuffer += cleaned
    if (this.contextBuffer.length > CONTEXT_BUFFER_SIZE) {
      this.contextBuffer = this.contextBuffer.slice(-CONTEXT_BUFFER_SIZE)
    }

    const recent = this.contextBuffer.slice(-RECENT_WINDOW)

    // Detect subagents
    this.detectSubagents(recent)

    // Detect PR URLs
    this.detectPrUrls(recent)

    // Detect context usage
    this.detectContextUsage()

    // Determine status in priority order
    const detected = this.detectStatus(recent)
    if (detected && detected !== this.currentStatus) {
      this.transitionTo(detected)
    }
  }

  getCurrentStatus(): AgentStatus {
    return this.currentStatus
  }

  setExited(exitCode: number | null): void {
    this.clearDebounce()
    if (exitCode === 0 || exitCode === null) {
      this.setStatus('done')
    } else {
      this.setStatus('error')
    }
  }

  private detectStatus(recent: string): AgentStatus | null {
    // Priority 1: Done
    if (/Total cost:/i.test(recent) || /tokens used/i.test(recent)) {
      return 'done'
    }

    // Priority 2: PR Ready
    if (
      /github\.com\/[^\s]+\/pull\/\d+/.test(recent) ||
      /gh pr create/.test(recent) ||
      /Creating pull request/i.test(recent) ||
      /git push.*origin/.test(recent)
    ) {
      return 'pr_ready'
    }

    // Priority 3: Building
    if (matchesBuilding(recent)) {
      return 'building'
    }

    // Priority 3b: Extended building check when stuck in planning
    // Look at a larger window to catch tool uses that scrolled past the recent window
    if (this.currentStatus === 'planning') {
      const extended = this.contextBuffer.slice(-EXTENDED_WINDOW)
      if (matchesBuilding(extended)) {
        return 'building'
      }
    }

    // Priority 4: Planning
    if (matchesPlanning(recent)) {
      return 'planning'
    }

    return null
  }

  private transitionTo(newStatus: AgentStatus): void {
    // Terminal states always apply immediately
    if (TERMINAL_STATUSES.has(newStatus)) {
      this.clearDebounce()
      this.setStatus(newStatus)
      return
    }

    // Forward-only: reject transitions that would go backward
    const newRank = STATUS_RANK[newStatus]
    const currentRank = STATUS_RANK[this.currentStatus]
    if (newRank <= currentRank && !TERMINAL_STATUSES.has(this.currentStatus)) {
      return
    }

    // Immediate transition from idle → planning
    if (this.currentStatus === 'idle' && newStatus === 'planning') {
      this.clearDebounce()
      this.setStatus(newStatus)
      return
    }

    // Debounced transitions: planning→building, building→pr_ready
    if (this.pendingStatus === newStatus) return

    this.clearDebounce()
    this.pendingStatus = newStatus
    this.debounceTimer = setTimeout(() => {
      if (this.pendingStatus) {
        // Re-check forward-only at commit time
        const pendingRank = STATUS_RANK[this.pendingStatus]
        const curRank = STATUS_RANK[this.currentStatus]
        if (pendingRank > curRank || TERMINAL_STATUSES.has(this.pendingStatus)) {
          this.setStatus(this.pendingStatus)
        }
        this.pendingStatus = null
      }
    }, DEBOUNCE_MS)
  }

  private setStatus(status: AgentStatus): void {
    if (status === this.currentStatus) return
    this.currentStatus = status
    this.events.onStatusChange(status)
  }

  private clearDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.pendingStatus = null
  }

  private detectSubagents(recent: string): void {
    const taskMatch = recent.match(/Task\(([^)]{0,200})\)/)
    if (taskMatch) {
      const desc = taskMatch[1].trim()
      if (desc && !this.detectedSubagentTasks.has(desc)) {
        this.detectedSubagentTasks.add(desc)
        this.events.onSubagentDetected(desc)
      }
    }
  }

  private detectContextUsage(): void {
    const buffer = this.contextBuffer
    let used = -1
    let max = 200

    // Search full buffer for the last match of context usage patterns
    // Primary: "45.2k ctx"
    const primaryRegex = /(\d+(?:\.\d+)?)\s*k\s*ctx/g
    let match: RegExpExecArray | null
    while ((match = primaryRegex.exec(buffer)) !== null) {
      used = parseFloat(match[1])
    }

    // Fallback: "45/200k" or "45.2k / 200k"
    if (used === -1) {
      const fallbackRegex = /(\d+(?:\.\d+)?)\s*k?\s*\/\s*(\d+(?:\.\d+)?)\s*k/g
      while ((match = fallbackRegex.exec(buffer)) !== null) {
        used = parseFloat(match[1])
        max = parseFloat(match[2])
      }
    }

    if (used !== -1 && used !== this.lastContextUsed) {
      this.lastContextUsed = used
      this.events.onContextUsageChanged(used, max)
    }
  }

  private detectPrUrls(recent: string): void {
    const prMatch = recent.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/)
    if (prMatch) {
      const url = prMatch[0]
      if (!this.detectedPrUrls.has(url)) {
        this.detectedPrUrls.add(url)
        this.events.onPrDetected(url)
      }
    }
  }
}

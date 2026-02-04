import type { AgentStatus, AgentTask, AgentTaskStatus } from '@shared/agent-types'
import { cleanTerminalOutput } from '@shared/strip-ansi'

interface StatusDetectorEvents {
  onStatusChange: (status: AgentStatus) => void
  onSubagentDetected: (taskDescription: string) => void
  onPrDetected: (prUrl: string) => void
  onContextUsageChanged: (used: number, max: number) => void
  onTasksChanged: (tasks: AgentTask[]) => void
  onPlanDetected: (planFilePath: string) => void
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
  private taskCounter = 0
  private detectedTasks = new Map<string, AgentTask>()
  private claudeIdToOurId = new Map<string, number>()
  private lastTaskScanOffset = 0
  private _isStopped = false
  private detectedPlanFilePath: string | null = null

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

    // Detect tasks
    this.detectTasks()

    // Detect plan file
    this.detectPlanFile(recent)

    // Determine status in priority order
    const detected = this.detectStatus(recent)
    if (detected && detected !== this.currentStatus) {
      this.transitionTo(detected)
    }
  }

  getCurrentStatus(): AgentStatus {
    return this.currentStatus
  }

  setStopped(): void {
    this._isStopped = true
    this.clearDebounce()
    this.setStatus('stopped')
  }

  setExited(exitCode: number | null): void {
    this.clearDebounce()

    // If manually stopped, don't override with done/error
    if (this._isStopped) return

    if (exitCode === 0 || exitCode === null) {
      // If a PR was detected, stay at pr_ready (wait for merge)
      if (this.detectedPrUrls.size > 0) {
        this.setStatus('pr_ready')
      } else {
        this.setStatus('done')
      }
    } else {
      this.setStatus('error')
    }
  }

  private detectStatus(recent: string): AgentStatus | null {
    // Priority 1: PR Ready
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

  private detectPlanFile(recent: string): void {
    const planMatch = recent.match(/Wrote to\s+(\/[^\s]+\.claude\/plans\/[^\s]+\.md)/)
    if (planMatch) {
      const path = planMatch[1]
      if (path !== this.detectedPlanFilePath) {
        this.detectedPlanFilePath = path
        this.events.onPlanDetected(path)
      }
    }
  }

  private detectTasks(): void {
    const buffer = this.contextBuffer
    // Only scan new text since last check
    const scanFrom = Math.max(0, this.lastTaskScanOffset)
    if (scanFrom >= buffer.length) return

    const newText = buffer.slice(scanFrom)
    this.lastTaskScanOffset = buffer.length

    let changed = false

    // Detect TaskCreate: extract subject (and optionally activeForm)
    const createRegex = /TaskCreate\b[\s\S]{0,500}?subject[:\s]*"?([^"\n]{1,200})"?/g
    let match: RegExpExecArray | null
    while ((match = createRegex.exec(newText)) !== null) {
      const subject = match[1].trim()
      if (!subject) continue

      // Deduplicate by subject text
      const existingBySubject = Array.from(this.detectedTasks.values()).find(
        (t) => t.subject === subject
      )
      if (existingBySubject) continue

      this.taskCounter++
      const task: AgentTask = {
        id: this.taskCounter,
        subject,
        status: 'pending'
      }

      // Try to extract activeForm near this match
      const vicinity = newText.slice(
        Math.max(0, match.index - 50),
        Math.min(newText.length, match.index + match[0].length + 300)
      )
      const activeFormMatch = vicinity.match(/activeForm[:\s]*"?([^"\n]{1,200})"?/)
      if (activeFormMatch) {
        task.activeForm = activeFormMatch[1].trim()
      }

      // Try to extract Claude's taskId for mapping
      const idMatch = vicinity.match(/taskId[:\s]*"?(\d+)"?/)
      if (idMatch) {
        this.claudeIdToOurId.set(idMatch[1], task.id)
      }

      this.detectedTasks.set(String(task.id), task)
      changed = true
    }

    // Detect TaskUpdate: find taskId and status
    const updateRegex =
      /TaskUpdate\b[\s\S]{0,500}?taskId[:\s]*"?(\d+)"?[\s\S]{0,200}?status[:\s]*"?(pending|in_progress|completed)"?/g
    while ((match = updateRegex.exec(newText)) !== null) {
      const claudeTaskId = match[1]
      const newStatus = match[2] as AgentTaskStatus

      // Map Claude's task ID to our sequential ID
      const ourId = this.claudeIdToOurId.get(claudeTaskId)
      if (ourId !== undefined) {
        const task = this.detectedTasks.get(String(ourId))
        if (task && task.status !== newStatus) {
          task.status = newStatus
          changed = true
        }
      } else {
        // Try matching by order: Claude's ID 1 = our first task, etc.
        const orderedTasks = Array.from(this.detectedTasks.values()).sort(
          (a, b) => a.id - b.id
        )
        const idx = parseInt(claudeTaskId, 10) - 1
        if (idx >= 0 && idx < orderedTasks.length) {
          const task = orderedTasks[idx]
          if (task.status !== newStatus) {
            task.status = newStatus
            this.claudeIdToOurId.set(claudeTaskId, task.id)
            changed = true
          }
        }
      }

      // Try to extract activeForm near this match
      const vicinity = newText.slice(
        Math.max(0, match.index),
        Math.min(newText.length, match.index + match[0].length + 200)
      )
      const activeFormMatch = vicinity.match(/activeForm[:\s]*"?([^"\n]{1,200})"?/)
      if (activeFormMatch) {
        const aOurId = this.claudeIdToOurId.get(claudeTaskId)
        if (aOurId !== undefined) {
          const task = this.detectedTasks.get(String(aOurId))
          if (task) {
            task.activeForm = activeFormMatch[1].trim()
            changed = true
          }
        }
      }
    }

    if (changed) {
      const orderedTasks = Array.from(this.detectedTasks.values()).sort(
        (a, b) => a.id - b.id
      )
      this.events.onTasksChanged(orderedTasks)
    }
  }
}

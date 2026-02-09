import type { AgentStatus, AgentTask, AgentTaskStatus } from '@shared/agent-types'
import { cleanTerminalOutput } from '@shared/strip-ansi'

interface StatusDetectorEvents {
  onStatusChange: (status: AgentStatus) => void
  onSubagentDetected: (taskDescription: string) => void
  onPrDetected: (prUrl: string) => void
  onContextUsageChanged: (used: number, max: number) => void
  onTasksChanged: (tasks: AgentTask[]) => void
  onPlanDetected: (planFilePath: string) => void
  onInputNeeded: (prompt: string) => void
  onCommitQuestionDetected: () => void // Fired when Claude asks about committing (no-branch mode)
}

const CONTEXT_BUFFER_SIZE = 10 * 1024 // 10KB rolling context
const RECENT_WINDOW = 1500 // chars to check for pattern matching

const TERMINAL_STATUSES: Set<AgentStatus> = new Set(['done', 'error', 'stopped'])

// --- Pattern helpers ---

// Planning = thinking/reading. Returns true if the CURRENT activity is planning.
function isThinking(text: string): boolean {
  // Get just the last ~300 chars to see current activity
  const recent = text.slice(-300)

  return (
    // Read/search tool invocations
    /\b(?:Read|Glob|Grep|Ls|WebSearch|WebFetch)\b/i.test(recent) ||
    // Thinking/reasoning
    /\b(?:Thinking|Reasoning|Analyzing|Exploring|Examining|Investigating)\b/i.test(recent) ||
    // Claude describing what it will do (planning phase)
    /\b(?:I'll|Let me|I will|I need to|I'm going to)\s+(?:read|search|look|check|find|explore|examine|analyze|understand|investigate)/i.test(recent) ||
    // Explicit plan
    /\bPlan:/i.test(recent)
  )
}


// Patterns that indicate Claude Code is waiting for user input at the prompt
function matchesWaitingAtPrompt(text: string): { waiting: boolean; prompt: string } {
  // Get the last ~500 chars to check for prompt patterns
  const tail = text.slice(-500)

  // Claude Code prompt patterns - waiting for user input
  // Look for the ">" prompt or question patterns at the very end

  // Pattern: ends with "> " (Claude Code's input prompt)
  if (/>\s*$/.test(tail)) {
    // Check if there's a question or context before the prompt
    const contextMatch = tail.match(/([^\n]{0,100})\s*>\s*$/)
    const context = contextMatch ? contextMatch[1].trim() : ''
    return { waiting: true, prompt: context || 'Waiting for input' }
  }

  // Pattern: ends with a question mark followed by whitespace/newline
  const questionEnd = tail.match(/([^\n]{10,150}\?)\s*$/)
  if (questionEnd) {
    return { waiting: true, prompt: questionEnd[1].trim() }
  }

  // Pattern: "(y/n)" or "[Y/n]" style prompts
  const ynPrompt = tail.match(/(\[[YyNn]\/[YyNn]\]|\([YyNn]\/[YyNn]\))\s*:?\s*$/)
  if (ynPrompt) {
    const contextMatch = tail.match(/([^\n]{0,80})\s*(?:\[[YyNn]\/[YyNn]\]|\([YyNn]\/[YyNn]\))\s*:?\s*$/)
    return { waiting: true, prompt: contextMatch ? contextMatch[1].trim() : 'Yes/No question' }
  }

  // Pattern: "Press Enter" or "Type" prompts
  if (/(?:press enter|type .{1,30}|enter .{1,30})\s*:?\s*$/i.test(tail)) {
    return { waiting: true, prompt: 'Waiting for input' }
  }

  return { waiting: false, prompt: '' }
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
  private lastInputPrompt: string | null = null
  private inputNeededCooldown = false
  private idleTimer: NodeJS.Timeout | null = null
  private idleDoneTimer: NodeJS.Timeout | null = null
  private lastDataTime = 0
  private commitQuestionDetected = false

  constructor(events: StatusDetectorEvents) {
    this.events = events
  }

  feed(rawData: string): void {
    const cleaned = cleanTerminalOutput(rawData)
    this.contextBuffer += cleaned
    if (this.contextBuffer.length > CONTEXT_BUFFER_SIZE) {
      const overflow = this.contextBuffer.length - CONTEXT_BUFFER_SIZE
      this.contextBuffer = this.contextBuffer.slice(-CONTEXT_BUFFER_SIZE)
      // Adjust task scan offset so detectTasks() doesn't skip new content
      this.lastTaskScanOffset = Math.max(0, this.lastTaskScanOffset - overflow)
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

    // Detect if input is needed
    this.detectInputNeeded(recent)

    // Detect commit-related questions (for no-branch mode)
    this.detectCommitQuestion(recent)

    // Detect Jira ticket creation - move to done immediately
    if (this.detectJiraTicketCreated(recent)) {
      this.setStatus('done')
      return
    }

    // Determine status in priority order
    const detected = this.detectStatus(recent)
    if (detected && detected !== this.currentStatus) {
      this.transitionTo(detected)
    }

    // Check for idle completion (building done, no PR, no prompt)
    this.checkIdleCompletion()
  }

  private detectJiraTicketCreated(recent: string): boolean {
    // Pattern: "Created Jira ticket XXX-123:"
    return /Created Jira ticket [A-Z]+-\d+:/i.test(recent)
  }

  private checkIdleCompletion(): void {
    // Clear existing idle done timer
    if (this.idleDoneTimer) {
      clearTimeout(this.idleDoneTimer)
      this.idleDoneTimer = null
    }

    // Only check if in building status
    if (this.currentStatus !== 'building') return
    if (this._isStopped) return

    // After 10 seconds of no activity, move to done if no PR
    this.idleDoneTimer = setTimeout(() => {
      // Re-check conditions
      if (this.currentStatus !== 'building') return
      if (this._isStopped) return
      if (this.detectedPrUrls.size > 0) return

      // No activity for 10 seconds, no PR - we're done
      this.setStatus('done')
    }, 10000)
  }

  getCurrentStatus(): AgentStatus {
    return this.currentStatus
  }

  setStopped(): void {
    this._isStopped = true
    this.clearDebounce()
    this.clearInputNeeded()
    this.clearIdleDone()
    this.setStatus('stopped')
  }

  private clearIdleDone(): void {
    if (this.idleDoneTimer) {
      clearTimeout(this.idleDoneTimer)
      this.idleDoneTimer = null
    }
  }

  setExited(exitCode: number | null): void {
    this.clearDebounce()

    // If manually stopped, don't override with done/error
    if (this._isStopped) return

    if (exitCode === 0 || exitCode === null) {
      // If a PR was detected, ensure pr_ready status
      if (this.detectedPrUrls.size > 0) {
        this.setStatus('pr_ready')
      } else {
        // No PR detected, move to done
        this.setStatus('done')
      }
    } else {
      this.setStatus('error')
    }
  }

  private detectStatus(recent: string): AgentStatus | null {
    // Priority 1: PR Ready - only trigger on actual PR URL
    if (/https:\/\/github\.com\/[^\s]+\/pull\/\d+/.test(recent)) {
      return 'pr_ready'
    }

    // If idle, start with planning on first activity
    if (this.currentStatus === 'idle' && this.contextBuffer.length > 200) {
      return 'planning'
    }

    // Simple logic: thinking = planning, everything else = building
    if (isThinking(this.contextBuffer)) {
      return 'planning'
    }

    // If we have activity and not thinking, we're building
    if (this.contextBuffer.length > 200) {
      return 'building'
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

    // pr_ready is sticky - once we have a PR, stay there until terminal
    if (this.currentStatus === 'pr_ready') {
      return
    }

    // Same status - no change needed
    if (newStatus === this.currentStatus) {
      return
    }

    // Immediate transition from idle
    if (this.currentStatus === 'idle') {
      this.clearDebounce()
      this.setStatus(newStatus)
      return
    }

    // Debounce transitions between planning/building to avoid flicker
    if (this.pendingStatus === newStatus) return

    this.clearDebounce()
    this.pendingStatus = newStatus

    // Short debounce for planning→building, longer for building→planning
    const debounceTime = newStatus === 'building' ? 500 : 1000

    this.debounceTimer = setTimeout(() => {
      if (this.pendingStatus) {
        this.setStatus(this.pendingStatus)
        this.pendingStatus = null
      }
    }, debounceTime)
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

  private detectInputNeeded(_recent: string): void {
    // Don't detect input if process is stopped
    if (this._isStopped) return

    // Reset idle timer on each data received
    this.lastDataTime = Date.now()

    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }

    // After 1.5 seconds of no new data, check if waiting at prompt
    this.idleTimer = setTimeout(() => {
      if (this._isStopped || this.inputNeededCooldown) return

      const result = matchesWaitingAtPrompt(this.contextBuffer)
      if (result.waiting && result.prompt !== this.lastInputPrompt) {
        this.lastInputPrompt = result.prompt
        this.events.onInputNeeded(result.prompt)

        // Set cooldown to avoid spamming notifications
        this.inputNeededCooldown = true
        setTimeout(() => {
          this.inputNeededCooldown = false
          this.lastInputPrompt = null // Reset so same prompt can trigger again
        }, 10000) // 10 second cooldown between notifications
      }
    }, 1500) // Wait 1.5 seconds of idle before checking
  }

  clearInputNeeded(): void {
    this.lastInputPrompt = null
    this.inputNeededCooldown = false
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  private detectCommitQuestion(recent: string): void {
    // Only detect once and only when in building status
    if (this.commitQuestionDetected || this.currentStatus !== 'building') return

    // Look for commit-related questions
    const hasCommitQuestion =
      /(?:commit|push).*\?/i.test(recent) ||
      /(?:should|would you like|want me to|shall).*(?:commit|push)/i.test(recent) ||
      /(?:ready to|create a).*commit/i.test(recent) ||
      /\[Y\/n\].*commit/i.test(recent) ||
      /\[y\/N\].*commit/i.test(recent)

    if (hasCommitQuestion) {
      this.commitQuestionDetected = true
      this.events.onCommitQuestionDetected()
    }
  }

  resetCommitQuestionDetected(): void {
    this.commitQuestionDetected = false
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

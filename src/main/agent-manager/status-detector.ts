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
}

const CONTEXT_BUFFER_SIZE = 10 * 1024 // 10KB rolling context
const RECENT_WINDOW = 1500 // chars to check for pattern matching

const FORWARD_DEBOUNCE_MS = 1500 // planning→building
const BACKWARD_DEBOUNCE_MS = 4000 // building→planning
const BUILDING_STICKINESS_MS = 12000 // stay "building" for 12s after last build tool

const TERMINAL_STATUSES: Set<AgentStatus> = new Set(['done', 'error', 'stopped'])

// Tool categories for per-chunk activity tracking
const PLANNING_TOOLS = new Set([
  'Read',
  'Glob',
  'Grep',
  'Ls',
  'WebSearch',
  'WebFetch',
  'EnterPlanMode',
  'AskUserQuestion',
  'Task'
])

const BUILDING_TOOLS = new Set([
  'Write',
  'Edit',
  'MultiEdit',
  'Bash',
  'NotebookEdit',
  'ExitPlanMode',
  'Skill'
])

// Regex to detect tool invocations in output chunks
const TOOL_REGEX =
  /\b(Read|Write|Edit|MultiEdit|Glob|Grep|Bash|WebSearch|WebFetch|Ls|NotebookEdit|EnterPlanMode|ExitPlanMode|AskUserQuestion|Task|Skill)[\s(]/g

// --- Pattern helpers ---

function matchesBuilding(text: string): boolean {
  return (
    // Tool invocations: "Write(" or "Write src/..."
    /\b(?:Write|Edit|MultiEdit)[\s(]/.test(text) ||
    // Past-tense tool results
    /\b(?:Wrote to|Updated|Created|Edited|Modified)\s/.test(text) ||
    // Bash tool
    /\bBash[\s(]/.test(text) ||
    // Notebook edits
    /\bNotebookEdit[\s(]/.test(text) ||
    // Exit plan mode (done planning, about to build)
    /\bExitPlanMode\b/.test(text) ||
    // Executing a skill
    /\bSkill[\s(]/.test(text) ||
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
    // Explicit plan mode entry
    /\bEnterPlanMode\b/.test(text) ||
    // Asking for clarification
    /\bAskUserQuestion\b/.test(text) ||
    // Spawning subagent (coordinating)
    /\bTask[\s(]/.test(text) ||
    // Descriptive planning verbs
    /\b(?:Searching|Analyzing|Reading|Exploring|Examining)\b/.test(text) ||
    // Explicit plan
    /\bPlan:/i.test(text) ||
    // Thinking/reasoning indicators
    /\b(?:Thinking|Reasoning)\b/.test(text)
  )
}

/** Low-confidence patterns only used to escape idle state */
function matchesEarlyActivity(text: string): boolean {
  return (
    // Claude Code's bullet/box drawing chars
    /[╭⏺●]/.test(text) ||
    // Common Claude opening phrases
    /\bI'll\b|\bLet me\b|\bI need to\b/i.test(text)
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
  private lastDataTime = 0
  // Activity-based tool tracking
  private lastBuildingTime = 0
  private lastPlanningTime = 0
  private lastToolCategory: 'planning' | 'building' | null = null

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

    // Scan this chunk for tool invocations (before window-based detection)
    this.detectToolInChunk(cleaned)

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
    this.clearInputNeeded()
    this.setStatus('stopped')
  }

  setExited(exitCode: number | null): void {
    this.clearDebounce()

    // If manually stopped, don't override with done/error
    if (this._isStopped) return

    if (exitCode === 0 || exitCode === null) {
      // If a PR was detected, ensure pr_ready status
      if (this.detectedPrUrls.size > 0) {
        this.setStatus('pr_ready')
      }
      // Otherwise keep current status — done is set via Mark Done or PR merge
    } else {
      this.setStatus('error')
    }
  }

  /** Scan each incoming chunk for tool invocations and update timestamps */
  private detectToolInChunk(cleaned: string): void {
    TOOL_REGEX.lastIndex = 0
    let lastMatch: string | null = null
    let m: RegExpExecArray | null
    while ((m = TOOL_REGEX.exec(cleaned)) !== null) {
      lastMatch = m[1]
    }
    if (!lastMatch) return

    const now = Date.now()
    if (BUILDING_TOOLS.has(lastMatch)) {
      this.lastToolCategory = 'building'
      this.lastBuildingTime = now
    } else if (PLANNING_TOOLS.has(lastMatch)) {
      this.lastToolCategory = 'planning'
      this.lastPlanningTime = now
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

    // Priority 2: Tool-based detection (primary signal)
    if (this.lastToolCategory === 'building') {
      return 'building'
    }
    if (this.lastToolCategory === 'planning') {
      const timeSinceBuilding = Date.now() - this.lastBuildingTime
      if (this.lastBuildingTime > 0 && timeSinceBuilding < BUILDING_STICKINESS_MS) {
        // Planning tools during building stickiness window → stay building
        return 'building'
      }
      return 'planning'
    }

    // Priority 3: Fallback window-based pattern matching
    if (matchesBuilding(recent)) {
      return 'building'
    }
    if (matchesPlanning(recent)) {
      return 'planning'
    }

    // Priority 4: Early activity detection (only from idle)
    if (this.currentStatus === 'idle' && matchesEarlyActivity(recent)) {
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

    // No backward transitions FROM terminal or pr_ready states
    if (TERMINAL_STATUSES.has(this.currentStatus) || this.currentStatus === 'pr_ready') {
      // Only allow pr_ready if currently in active zone
      return
    }

    // pr_ready is immediate and sticky (no backward from it)
    if (newStatus === 'pr_ready') {
      this.clearDebounce()
      this.setStatus(newStatus)
      return
    }

    // idle → planning: immediate
    if (this.currentStatus === 'idle' && newStatus === 'planning') {
      this.clearDebounce()
      this.setStatus(newStatus)
      return
    }

    // idle → building: force through planning first, then debounce to building
    if (this.currentStatus === 'idle' && newStatus === 'building') {
      this.setStatus('planning')
      this.pendingStatus = newStatus
      this.debounceTimer = setTimeout(() => {
        if (this.pendingStatus) {
          this.setStatus(this.pendingStatus)
          this.pendingStatus = null
        }
      }, FORWARD_DEBOUNCE_MS)
      return
    }

    // Active zone: bidirectional transitions between planning ↔ building
    const isForward =
      (this.currentStatus === 'planning' && newStatus === 'building') ||
      (this.currentStatus === 'building' && newStatus === 'pr_ready')
    const isBackward = this.currentStatus === 'building' && newStatus === 'planning'

    const debounceMs = isBackward ? BACKWARD_DEBOUNCE_MS : FORWARD_DEBOUNCE_MS

    if (!isForward && !isBackward) {
      // Same status or unexpected combination — ignore
      return
    }

    // Don't restart debounce if already pending the same status
    if (this.pendingStatus === newStatus) return

    this.clearDebounce()
    this.pendingStatus = newStatus
    this.debounceTimer = setTimeout(() => {
      if (this.pendingStatus) {
        this.setStatus(this.pendingStatus)
        this.pendingStatus = null
      }
    }, debounceMs)
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

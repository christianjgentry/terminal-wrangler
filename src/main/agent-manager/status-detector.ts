import type { AgentStatus } from '@shared/agent-types'

// Strip ANSI escape codes from terminal output
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '')
}

interface StatusDetectorEvents {
  onStatusChange: (status: AgentStatus) => void
  onSubagentDetected: (taskDescription: string) => void
  onPrDetected: (prUrl: string) => void
}

const CONTEXT_BUFFER_SIZE = 10 * 1024 // 10KB rolling context
const RECENT_WINDOW = 500 // chars to check for pattern matching
const DEBOUNCE_MS = 2000

export class StatusDetector {
  private contextBuffer = ''
  private currentStatus: AgentStatus = 'idle'
  private events: StatusDetectorEvents
  private debounceTimer: NodeJS.Timeout | null = null
  private pendingStatus: AgentStatus | null = null
  private detectedPrUrls = new Set<string>()
  private detectedSubagentTasks = new Set<string>()

  constructor(events: StatusDetectorEvents) {
    this.events = events
  }

  feed(rawData: string): void {
    const cleaned = stripAnsi(rawData)
    this.contextBuffer += cleaned
    if (this.contextBuffer.length > CONTEXT_BUFFER_SIZE) {
      this.contextBuffer = this.contextBuffer.slice(-CONTEXT_BUFFER_SIZE)
    }

    const recent = this.contextBuffer.slice(-RECENT_WINDOW)

    // Detect subagents
    this.detectSubagents(recent)

    // Detect PR URLs
    this.detectPrUrls(recent)

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
    if (
      /Write\(/.test(recent) ||
      /Edit\(/.test(recent) ||
      /Creating file/i.test(recent) ||
      /npm install/i.test(recent) ||
      /git add/.test(recent) ||
      /git commit/.test(recent) ||
      /Running.*test/i.test(recent)
    ) {
      return 'building'
    }

    // Priority 4: Planning
    if (
      /Read\(/.test(recent) ||
      /Glob\(/.test(recent) ||
      /Grep\(/.test(recent) ||
      /Searching/i.test(recent) ||
      /Analyzing/i.test(recent) ||
      /Plan:/i.test(recent)
    ) {
      return 'planning'
    }

    return null
  }

  private transitionTo(newStatus: AgentStatus): void {
    // Immediate transitions
    if (
      (this.currentStatus === 'idle' && newStatus === 'planning') ||
      newStatus === 'done' ||
      newStatus === 'error'
    ) {
      this.clearDebounce()
      this.setStatus(newStatus)
      return
    }

    // Debounced transitions: planning<->building, building->pr_ready
    if (this.pendingStatus === newStatus) return

    this.clearDebounce()
    this.pendingStatus = newStatus
    this.debounceTimer = setTimeout(() => {
      if (this.pendingStatus) {
        this.setStatus(this.pendingStatus)
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

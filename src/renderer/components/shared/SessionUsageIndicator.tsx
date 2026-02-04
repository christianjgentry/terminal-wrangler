import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { useSessionUsageStore } from '../../stores/session-usage-store'

export function SessionUsageIndicator(): JSX.Element {
  const usage = useSessionUsageStore((s) => s.usage)
  const refreshUsage = useSessionUsageStore((s) => s.refreshUsage)
  const setApiKey = useSessionUsageStore((s) => s.setApiKey)
  const [refreshing, setRefreshing] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyValue, setKeyValue] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Tick every 30s to keep countdown fresh (only when OAuth-connected)
  const [tick, setTick] = useState(0)
  const isOAuth = usage?.authMode === 'oauth'
  const oauthConnected = isOAuth && usage.error === null && (usage.fiveHour !== null || usage.sevenDay !== null)

  useEffect(() => {
    if (!oauthConnected) return
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [oauthConnected])

  const handleRetry = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refreshUsage()
    } finally {
      setRefreshing(false)
    }
  }, [refreshUsage, refreshing])

  const handleRefreshConnected = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refreshUsage()
    } finally {
      setRefreshing(false)
    }
  }, [refreshUsage, refreshing])

  const handleSaveKey = useCallback(async () => {
    const trimmed = keyValue.trim()
    if (!trimmed) return
    setSavingKey(true)
    try {
      await setApiKey(trimmed)
      setShowKeyInput(false)
      setKeyValue('')
    } finally {
      setSavingKey(false)
    }
  }, [keyValue, setApiKey])

  const handleClearKey = useCallback(async () => {
    setSavingKey(true)
    try {
      await setApiKey(null)
      setShowKeyInput(false)
      setKeyValue('')
    } finally {
      setSavingKey(false)
    }
  }, [setApiKey])

  // Close popover on outside click
  useEffect(() => {
    if (!showKeyInput) return
    const handler = (e: MouseEvent): void => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowKeyInput(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showKeyInput])

  // Focus input when popover opens
  useEffect(() => {
    if (showKeyInput) inputRef.current?.focus()
  }, [showKeyInput])

  const isApiKeyConnected = usage?.authMode === 'api-key' && usage.error === null

  const { percent, colorClass, barColorClass, countdown, tooltip, pulse } = useMemo(() => {
    if (!oauthConnected || !usage) {
      return { percent: 0, colorClass: '', barColorClass: '', countdown: '', tooltip: '', pulse: false }
    }

    const window = usage.fiveHour ?? usage.sevenDay
    if (!window) {
      return { percent: 0, colorClass: '', barColorClass: '', countdown: '', tooltip: '', pulse: false }
    }

    const pct = Math.round(window.utilization)
    const isPulse = pct > 90

    let color: string
    let barColor: string
    if (pct > 80) {
      color = 'text-red-400'
      barColor = 'bg-red-400'
    } else if (pct > 60) {
      color = 'text-yellow-400'
      barColor = 'bg-yellow-400'
    } else {
      color = 'text-blue-400'
      barColor = 'bg-blue-400'
    }

    const cd = formatCountdown(window.resetAt)

    const lines: string[] = []
    if (usage.fiveHour) {
      lines.push(`Session (5h): ${Math.round(usage.fiveHour.utilization)}% used`)
      if (usage.fiveHour.resetAt) lines.push(`  Resets: ${formatResetTime(usage.fiveHour.resetAt)}`)
    }
    if (usage.sevenDay) {
      lines.push(`Week (7d): ${Math.round(usage.sevenDay.utilization)}% used`)
      if (usage.sevenDay.resetAt) lines.push(`  Resets: ${formatResetTime(usage.sevenDay.resetAt)}`)
    }
    if (usage.sevenDaySonnet) {
      lines.push(`Week Sonnet: ${Math.round(usage.sevenDaySonnet.utilization)}% used`)
    }
    if (usage.subscriptionType) {
      lines.push(`Plan: ${usage.subscriptionType}`)
    }
    lines.push('Click to refresh')

    return {
      percent: pct,
      colorClass: color,
      barColorClass: barColor,
      countdown: cd,
      tooltip: lines.join('\n'),
      pulse: isPulse
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usage, oauthConnected, tick])

  // Refreshing state
  if (refreshing) {
    return (
      <button
        disabled
        className="no-drag flex items-center gap-1.5 px-2 py-1 rounded cursor-wait"
      >
        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-surface-500 animate-pulse w-full" />
        </div>
        <span className="text-[10px] font-medium text-surface-400">connecting...</span>
      </button>
    )
  }

  // API key connected — show green dot instead of misleading percentage bar
  if (isApiKeyConnected) {
    return (
      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => setShowKeyInput((v) => !v)}
          title="Connected via API key\nUsage tracking requires Claude CLI OAuth\nClick to configure"
          className="no-drag flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] font-medium text-green-400">
            Connected (API key)
          </span>
        </button>

        {showKeyInput && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-surface-800 border border-white/10 rounded-lg shadow-xl p-3 w-72">
            <div className="text-[11px] text-surface-300 mb-2">
              API key is valid. Usage tracking requires Claude CLI OAuth credentials.
            </div>

            <button
              onClick={handleRetry}
              className="w-full mb-2 px-2 py-1.5 text-[11px] font-medium text-surface-300 bg-white/5 hover:bg-white/10 rounded transition-colors"
            >
              Retry OAuth connection
            </button>

            <div className="border-t border-white/5 my-2" />

            <button
              onClick={handleClearKey}
              className="text-[10px] text-surface-500 hover:text-red-400 transition-colors"
            >
              Clear saved API key
            </button>
          </div>
        )}
      </div>
    )
  }

  // Disconnected / error state
  if (!oauthConnected) {
    const errorMsg = usage?.error ?? 'Not connected'
    const shortLabel = getShortErrorLabel(usage?.error ?? null)

    return (
      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => setShowKeyInput((v) => !v)}
          title={`${errorMsg}\nClick to configure`}
          className="no-drag flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full w-0" />
          </div>
          <span className="text-[10px] font-medium text-surface-500 hover:text-surface-400 transition-colors">
            {shortLabel}
          </span>
        </button>

        {showKeyInput && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-surface-800 border border-white/10 rounded-lg shadow-xl p-3 w-72">
            <div className="text-[11px] text-surface-300 mb-2">
              {errorMsg}
            </div>

            <button
              onClick={handleRetry}
              className="w-full mb-2 px-2 py-1.5 text-[11px] font-medium text-surface-300 bg-white/5 hover:bg-white/10 rounded transition-colors"
            >
              Retry OAuth connection
            </button>

            <div className="border-t border-white/5 my-2" />

            <div className="text-[10px] text-surface-500 mb-1.5">Or enter an Anthropic API key:</div>
            <div className="flex gap-1.5">
              <input
                ref={inputRef}
                type="password"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey() }}
                placeholder="sk-ant-..."
                className="flex-1 bg-surface-900 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder-surface-600 outline-none focus:border-blue-500/50"
              />
              <button
                onClick={handleSaveKey}
                disabled={!keyValue.trim() || savingKey}
                className="px-2 py-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
              >
                {savingKey ? '...' : 'Save'}
              </button>
            </div>

            {usage?.authMode === 'api-key' && (
              <button
                onClick={handleClearKey}
                className="mt-2 text-[10px] text-surface-500 hover:text-red-400 transition-colors"
              >
                Clear saved API key
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // OAuth connected state
  return (
    <button
      onClick={handleRefreshConnected}
      title={tooltip}
      className="no-drag flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
    >
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColorClass} ${pulse ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className={`text-[10px] font-medium tabular-nums ${colorClass}`}>
        {percent}%
      </span>
      {countdown && (
        <>
          <span className="text-[10px] text-surface-600">|</span>
          <span className="text-[10px] text-surface-400 tabular-nums">{countdown}</span>
        </>
      )}
    </button>
  )
}

function getShortErrorLabel(error: string | null): string {
  if (!error) return 'offline'
  if (error.includes('expired')) return 'expired'
  if (error.includes('refresh failed')) return 'expired'
  if (error.includes('401')) return 'auth failed'
  if (error.includes('403')) return 'forbidden'
  if (error.includes('timed out')) return 'timeout'
  if (error.includes('Network')) return 'no network'
  if (error.includes('not found')) return 'no creds'
  return 'offline'
}

function formatCountdown(resetAt: string): string {
  if (!resetAt) return ''
  const now = Date.now()
  const reset = new Date(resetAt).getTime()
  const diffMs = reset - now
  if (diffMs <= 0) return 'now'

  const mins = Math.floor(diffMs / 60_000)
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60

  if (hours > 0) {
    return `${hours}h ${remainMins}m`
  }
  return `${remainMins}m`
}

function formatResetTime(resetAt: string): string {
  if (!resetAt) return ''
  try {
    return new Date(resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return resetAt
  }
}

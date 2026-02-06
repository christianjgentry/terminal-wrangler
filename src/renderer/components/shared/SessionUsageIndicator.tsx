import { useCallback, useMemo, useState, useEffect } from 'react'
import { useSessionUsageStore } from '../../stores/session-usage-store'
import { useAppStore } from '../../stores/app-store'

export function SessionUsageIndicator(): JSX.Element {
  const usage = useSessionUsageStore((s) => s.usage)
  const refreshUsage = useSessionUsageStore((s) => s.refreshUsage)
  const setSettingsModalOpen = useAppStore((s) => s.setSettingsModalOpen)
  const [refreshing, setRefreshing] = useState(false)

  // Tick every 30s to keep countdown fresh
  const [tick, setTick] = useState(0)
  const isOAuth = usage?.authMode === 'oauth'
  const oauthConnected = isOAuth && usage.error === null && (usage.fiveHour !== null || usage.sevenDay !== null)

  useEffect(() => {
    if (!oauthConnected) return
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [oauthConnected])

  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refreshUsage()
    } finally {
      setRefreshing(false)
    }
  }, [refreshUsage, refreshing])

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

  // Disconnected / error state — point to Settings for CLI login
  if (!oauthConnected) {
    const shortLabel = getShortErrorLabel(usage?.error ?? null)

    return (
      <button
        onClick={() => setSettingsModalOpen(true)}
        title={`${usage?.error ?? 'Not connected'}\nClick to open Settings`}
        className="no-drag flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full w-0" />
        </div>
        <span className="text-[10px] font-medium text-surface-500 hover:text-surface-400 transition-colors">
          {shortLabel}
        </span>
      </button>
    )
  }

  // OAuth connected state
  return (
    <button
      onClick={handleRefresh}
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

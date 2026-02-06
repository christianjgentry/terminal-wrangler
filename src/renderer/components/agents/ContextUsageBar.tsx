import { memo } from 'react'

interface ContextUsageBarProps {
  used: number
  max: number
}

function getBarColor(percentage: number): string {
  if (percentage >= 80) return '#ef4444'
  if (percentage >= 60) return '#eab308'
  return '#3b82f6'
}

export const ContextUsageBar = memo(function ContextUsageBar({ used, max }: ContextUsageBarProps): JSX.Element {
  const percentage = Math.min((used / max) * 100, 100)
  const color = getBarColor(percentage)
  const shouldPulse = percentage > 90
  const displayUsed = used % 1 === 0 ? used : used.toFixed(1)
  const pctDisplay = Math.round(percentage)

  return (
    <div
      className="relative w-full h-3 bg-surface-900/50"
      title={`${displayUsed}k / ${max}k context tokens (${pctDisplay}%)`}
    >
      <div
        className={`h-full transition-all duration-500 ease-out${shouldPulse ? ' animate-pulse' : ''}`}
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white/70">
        {pctDisplay}%
      </span>
    </div>
  )
})

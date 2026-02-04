interface ContextUsageBarProps {
  used: number
  max: number
}

function getBarColor(percentage: number): string {
  if (percentage >= 80) return '#ef4444'
  if (percentage >= 60) return '#eab308'
  return '#3b82f6'
}

export function ContextUsageBar({ used, max }: ContextUsageBarProps): JSX.Element {
  const percentage = Math.min((used / max) * 100, 100)
  const color = getBarColor(percentage)
  const shouldPulse = percentage > 90

  return (
    <div className="space-y-0.5">
      <div className="w-full h-1 bg-surface-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out${shouldPulse ? ' animate-pulse' : ''}`}
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[9px] text-surface-500">
        {used % 1 === 0 ? used : used.toFixed(1)}k / {max}k ctx
      </p>
    </div>
  )
}

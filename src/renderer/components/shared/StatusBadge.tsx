import type { ServiceStatus } from '@shared/types'
import { statusColors, statusLabels } from '../../lib/status-colors'

interface StatusBadgeProps {
  status: ServiceStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps): JSX.Element {
  const color = statusColors[status]
  const label = statusLabels[status]
  const isAnimating = status === 'starting' || status === 'stopping'

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center justify-center">
        <div
          className={`rounded-full ${size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'}`}
          style={{ backgroundColor: color }}
        />
        {isAnimating && (
          <div
            className="absolute rounded-full animate-ping opacity-75"
            style={{
              backgroundColor: color,
              width: size === 'sm' ? 8 : 10,
              height: size === 'sm' ? 8 : 10
            }}
          />
        )}
      </div>
      <span
        className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-medium uppercase tracking-wider`}
        style={{ color }}
      >
        {label}
      </span>
    </div>
  )
}

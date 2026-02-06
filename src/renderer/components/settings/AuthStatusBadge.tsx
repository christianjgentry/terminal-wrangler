type AuthStatus = 'checking' | 'connected' | 'disconnected' | 'error'

const STATUS_CONFIG: Record<AuthStatus, { dot: string; label: string }> = {
  checking: { dot: 'bg-surface-500 animate-pulse', label: 'Checking...' },
  connected: { dot: 'bg-emerald-400', label: 'Connected' },
  disconnected: { dot: 'bg-surface-600', label: 'Not connected' },
  error: { dot: 'bg-red-400', label: 'Error' }
}

interface AuthStatusBadgeProps {
  status: AuthStatus
}

export function AuthStatusBadge({ status }: AuthStatusBadgeProps): JSX.Element {
  const config = STATUS_CONFIG[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span
        className={`text-[10px] font-medium ${
          status === 'connected'
            ? 'text-emerald-400'
            : status === 'error'
              ? 'text-red-400'
              : 'text-surface-400'
        }`}
      >
        {config.label}
      </span>
    </span>
  )
}

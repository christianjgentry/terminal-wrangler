import { useCallback, useEffect } from 'react'

interface ConfirmStopDialogProps {
  open: boolean
  agentName: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmStopDialog({
  open,
  agentName,
  onConfirm,
  onCancel
}: ConfirmStopDialogProps): JSX.Element | null {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    },
    [onCancel]
  )

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="bg-surface-900 border border-white/10 rounded-xl w-[360px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-surface-200">Stop Agent</h2>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-surface-400">
            Are you sure you want to stop <span className="text-surface-200 font-medium">{agentName}</span>?
            This will terminate the running Claude Code process.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/5">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Stop Agent
          </button>
        </div>
      </div>
    </div>
  )
}

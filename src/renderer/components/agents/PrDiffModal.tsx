import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PrDiffModalProps {
  prUrl: string
  onClose: () => void
}

export function PrDiffModal({ prUrl, onClose }: PrDiffModalProps): JSX.Element {
  const [diff, setDiff] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.getPrDiff(prUrl).then((result) => {
      if (cancelled) return
      if (result === null) {
        setError('Failed to fetch diff')
      } else {
        setDiff(result)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [prUrl])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-surface-900 border border-white/10 rounded-lg w-[90vw] max-w-4xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-medium text-surface-200">PR Diff</span>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-white text-sm px-2 py-0.5 rounded hover:bg-surface-700 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-full text-surface-400 text-sm">
              Loading diff...
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-red-400 text-sm">
              {error}
            </div>
          )}
          {diff !== null && (
            <pre className="text-[11px] leading-relaxed font-mono text-surface-300 whitespace-pre overflow-x-auto">
              {diff}
            </pre>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

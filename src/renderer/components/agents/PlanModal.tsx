import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PlanModalProps {
  agentId: string
  agentName: string
  onClose: () => void
}

export function PlanModal({ agentId, agentName, onClose }: PlanModalProps): JSX.Element {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.getAgentPlanContent(agentId).then((result) => {
      if (cancelled) return
      if (result === null) {
        setError('Failed to read plan file')
      } else {
        setContent(result)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [agentId])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSave = (e: React.MouseEvent): void => {
    e.stopPropagation()
    window.api.saveAgentPlan(agentId)
  }

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
          <span className="text-sm font-medium text-surface-200">Plan: {agentName}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="text-accent-light hover:text-white text-sm px-2 py-0.5 rounded hover:bg-surface-700 transition-colors"
            >
              Save as...
            </button>
            <button
              onClick={onClose}
              className="text-surface-400 hover:text-white text-sm px-2 py-0.5 rounded hover:bg-surface-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-full text-surface-400 text-sm">
              Loading plan...
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-red-400 text-sm">
              {error}
            </div>
          )}
          {content !== null && (
            <pre className="text-[11px] leading-relaxed font-mono text-surface-300 whitespace-pre-wrap">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

import { useState } from 'react'
import type { PrInfo } from '@shared/github-types'
import { PrDiffModal } from './PrDiffModal'

interface PrStatusSectionProps {
  prUrl: string
  prInfo?: PrInfo
  agentId: string
  onMerged?: () => void
}

const STATE_BADGE: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-emerald-500/20 text-emerald-400' },
  MERGED: { label: 'Merged', className: 'bg-purple-500/20 text-purple-400' },
  CLOSED: { label: 'Closed', className: 'bg-surface-600 text-surface-400' }
}

const CHECKS_BADGE: Record<string, { label: string; className: string }> = {
  PASSING: { label: 'CI ✓', className: 'bg-emerald-500/20 text-emerald-400' },
  FAILING: { label: 'CI ✗', className: 'bg-red-500/20 text-red-400' },
  PENDING: { label: 'CI …', className: 'bg-yellow-500/20 text-yellow-400' },
  UNKNOWN: { label: 'CI ?', className: 'bg-surface-600 text-surface-400' }
}

const REVIEW_BADGE: Record<string, { label: string; className: string }> = {
  APPROVED: { label: 'Approved', className: 'bg-emerald-500/20 text-emerald-400' },
  CHANGES_REQUESTED: { label: 'Changes', className: 'bg-red-500/20 text-red-400' },
  REVIEW_REQUIRED: { label: 'Review', className: 'bg-yellow-500/20 text-yellow-400' }
}

export function PrStatusSection({ prUrl, prInfo, agentId, onMerged }: PrStatusSectionProps): JSX.Element {
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  const handleMerge = async (): Promise<void> => {
    setMerging(true)
    setMergeError(null)
    const result = await window.api.mergePr(prUrl)
    setMerging(false)
    if (result.success) {
      onMerged?.()
    } else {
      setMergeError(result.error ?? 'Merge failed')
      setTimeout(() => setMergeError(null), 5000)
    }
  }

  if (!prInfo) {
    return (
      <a
        href={prUrl}
        onClick={(e) => {
          e.stopPropagation()
          window.open(prUrl, '_blank')
        }}
        className="text-[9px] text-emerald-400 hover:text-emerald-300 truncate max-w-[120px]"
      >
        PR Link
      </a>
    )
  }

  const state = STATE_BADGE[prInfo.state] ?? STATE_BADGE.OPEN
  const checks = CHECKS_BADGE[prInfo.checksStatus] ?? CHECKS_BADGE.UNKNOWN
  const review = prInfo.reviewDecision ? REVIEW_BADGE[prInfo.reviewDecision] : null

  const canMerge =
    prInfo.state === 'OPEN' &&
    prInfo.mergeable !== 'CONFLICTING' &&
    prInfo.checksStatus !== 'FAILING'

  return (
    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
      <a
        href={prInfo.url}
        onClick={(e) => {
          e.preventDefault()
          window.open(prInfo.url, '_blank')
        }}
        className="text-[9px] text-emerald-400 hover:text-emerald-300 truncate block max-w-[180px]"
        title={prInfo.title}
      >
        #{prInfo.number} {prInfo.title}
      </a>
      <div className="flex items-center gap-1 flex-wrap">
        <span className={`text-[8px] px-1 py-px rounded ${state.className}`}>
          {state.label}
        </span>
        <span className={`text-[8px] px-1 py-px rounded ${checks.className}`}>
          {checks.label}
        </span>
        {review && (
          <span className={`text-[8px] px-1 py-px rounded ${review.className}`}>
            {review.label}
          </span>
        )}
        {prInfo.mergeable === 'CONFLICTING' && (
          <span className="text-[8px] px-1 py-px rounded bg-red-500/20 text-red-400">
            Conflict
          </span>
        )}
      </div>

      {/* Action buttons */}
      {prInfo.state === 'OPEN' && (
        <div className="flex items-center gap-1 pt-0.5">
          <button
            onClick={handleMerge}
            disabled={!canMerge || merging}
            className="px-1.5 py-0.5 text-[8px] rounded transition-colors bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {merging ? 'Merging...' : 'Merge'}
          </button>
          <button
            onClick={() => setShowDiff(true)}
            className="px-1.5 py-0.5 text-[8px] rounded transition-colors bg-surface-700 text-surface-300 hover:bg-surface-600"
          >
            Diff
          </button>
          <button
            onClick={() => window.open(prInfo.url, '_blank')}
            className="px-1.5 py-0.5 text-[8px] rounded transition-colors bg-surface-700 text-surface-300 hover:bg-surface-600"
          >
            Open
          </button>
        </div>
      )}

      {mergeError && (
        <p className="text-[8px] text-red-400 mt-0.5">{mergeError}</p>
      )}

      {showDiff && (
        <PrDiffModal prUrl={prUrl} onClose={() => setShowDiff(false)} />
      )}
    </div>
  )
}

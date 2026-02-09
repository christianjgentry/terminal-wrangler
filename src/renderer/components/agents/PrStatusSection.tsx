import { useState } from 'react'
import type { PrInfo } from '@shared/github-types'
import type { AgentStatus } from '@shared/agent-types'
import { PrDiffModal } from './PrDiffModal'

interface PrStatusSectionProps {
  prUrl: string
  prInfo?: PrInfo
  agentId: string
  agentStatus?: AgentStatus
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

export function PrStatusSection({ prUrl, prInfo, agentId, agentStatus, onMerged }: PrStatusSectionProps): JSX.Element {
  const [approving, setApproving] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  const handleApprove = async (): Promise<void> => {
    setApproving(true)
    setActionError(null)
    try {
      const result = await window.api.approvePr(prUrl, agentId)
      if (result.success) {
        onMerged?.()
      } else {
        setActionError(result.error ?? 'Failed to approve')
        setTimeout(() => setActionError(null), 5000)
      }
    } catch (err) {
      console.error('Approve error:', err)
      setActionError(err instanceof Error ? err.message : 'Failed to approve')
      setTimeout(() => setActionError(null), 5000)
    } finally {
      setApproving(false)
    }
  }

  const handleDecline = async (): Promise<void> => {
    setDeclining(true)
    setActionError(null)
    try {
      const result = await window.api.declinePr(prUrl, agentId)
      if (result.success) {
        onMerged?.()
      } else {
        setActionError(result.error ?? 'Failed to decline PR')
        setTimeout(() => setActionError(null), 5000)
      }
    } catch (err) {
      console.error('Decline PR error:', err)
      setActionError(err instanceof Error ? err.message : 'Failed to decline PR')
      setTimeout(() => setActionError(null), 5000)
    } finally {
      setDeclining(false)
    }
  }

  const state = prInfo ? (STATE_BADGE[prInfo.state] ?? STATE_BADGE.OPEN) : null
  const checks = prInfo ? (CHECKS_BADGE[prInfo.checksStatus] ?? CHECKS_BADGE.UNKNOWN) : null
  const review = prInfo?.reviewDecision ? REVIEW_BADGE[prInfo.reviewDecision] : null
  const isOpen = (!prInfo || prInfo.state === 'OPEN') && agentStatus !== 'done'

  return (
    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
      {prInfo ? (
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
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-yellow-400">⏳ Loading PR info...</span>
        </div>
      )}

      {prInfo && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-[8px] px-1 py-px rounded ${state!.className}`}>
            {state!.label}
          </span>
          <span className={`text-[8px] px-1 py-px rounded ${checks!.className}`}>
            {checks!.label}
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
      )}

      {/* Action buttons - always show when PR is open or info not loaded */}
      {isOpen && (
        <div className="flex items-center gap-1 pt-0.5">
          <button
            onClick={handleApprove}
            disabled={!prInfo || approving || declining}
            title={!prInfo ? 'Waiting for PR info...' : 'Merge PR'}
            className="px-1.5 py-0.5 text-[8px] rounded transition-colors bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {approving ? 'Approving...' : 'Approve'}
          </button>
          <button
            onClick={handleDecline}
            disabled={!prInfo || approving || declining}
            title={!prInfo ? 'Waiting for PR info...' : 'Close PR without approving'}
            className="px-1.5 py-0.5 text-[8px] rounded transition-colors bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {declining ? 'Declining...' : 'Decline'}
          </button>
          <button
            onClick={() => setShowDiff(true)}
            className="px-1.5 py-0.5 text-[8px] rounded transition-colors bg-surface-700 text-surface-300 hover:bg-surface-600"
          >
            Changes
          </button>
          <button
            onClick={() => window.open(prInfo?.url ?? prUrl, '_blank')}
            className="px-1.5 py-0.5 text-[8px] rounded transition-colors bg-surface-700 text-surface-300 hover:bg-surface-600"
          >
            Open PR
          </button>
        </div>
      )}

      {actionError && (
        <p className="text-[8px] text-red-400 mt-0.5">{actionError}</p>
      )}

      {showDiff && (
        <PrDiffModal prUrl={prUrl} onClose={() => setShowDiff(false)} />
      )}
    </div>
  )
}

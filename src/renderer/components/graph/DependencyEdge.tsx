import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { ServiceStatus } from '@shared/types'
import { statusColors } from '../../lib/status-colors'

export interface DependencyEdgeData {
  sourceStatus: ServiceStatus
  [key: string]: unknown
}

export type DependencyEdgeType = Edge<DependencyEdgeData, 'dependency'>

function DependencyEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}: EdgeProps<DependencyEdgeType>): JSX.Element {
  const sourceStatus = data?.sourceStatus || 'idle'
  const color = statusColors[sourceStatus]
  const isActive = sourceStatus === 'running'
  const isStarting = sourceStatus === 'starting'

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: isActive ? 2 : 1.5,
          opacity: isActive ? 0.8 : 0.4,
          strokeDasharray: isStarting ? '5,5' : undefined
        }}
      />
      {isActive && (
        <circle r="3" fill={color}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  )
}

export const DependencyEdge = memo(DependencyEdgeComponent)

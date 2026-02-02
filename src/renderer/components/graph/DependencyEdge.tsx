import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { ServiceStatus } from '@shared/types'
import { statusColors } from '../../lib/status-colors'

export interface DependencyEdgeData {
  sourceStatus: ServiceStatus
  [key: string]: unknown
}

function DependencyEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}: EdgeProps): JSX.Element {
  const edgeData = data as unknown as DependencyEdgeData | undefined
  const sourceStatus = edgeData?.sourceStatus || 'idle'
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

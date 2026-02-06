import { useCallback, useMemo, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useServiceStore, type ServiceEntry } from '../../stores/service-store'
import { useAppStore } from '../../stores/app-store'
import { getLayoutedElements } from '../../lib/graph-layout'
import { statusColors } from '../../lib/status-colors'
import { ServiceNode, type ServiceNodeData, type ServiceNodeType } from './ServiceNode'
import { DependencyEdge } from './DependencyEdge'

const nodeTypes = { service: ServiceNode }
const edgeTypes = { dependency: DependencyEdge }

function buildGraph(services: Record<string, ServiceEntry>): { nodes: Node[]; edges: Edge[] } {
  const entries = Object.entries(services)

  // Build a set of services that have dependents
  const hasDependents = new Set<string>()
  for (const [, entry] of entries) {
    for (const dep of entry.config.dependsOn) {
      hasDependents.add(dep)
    }
  }

  const nodes: Node[] = entries.map(([id, entry]) => ({
    id,
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      label: entry.config.name,
      serviceId: id,
      status: entry.status,
      command: entry.config.command,
      tags: entry.config.tags || [],
      hasDependencies: entry.config.dependsOn.length > 0,
      hasDependents: hasDependents.has(id)
    } satisfies ServiceNodeData
  }))

  const edges: Edge[] = []
  for (const [id, entry] of entries) {
    for (const dep of entry.config.dependsOn) {
      const sourceEntry = services[dep]
      edges.push({
        id: `${dep}->${id}`,
        source: dep,
        target: id,
        type: 'dependency',
        data: {
          sourceStatus: sourceEntry?.status || 'idle'
        }
      })
    }
  }

  return getLayoutedElements(nodes, edges)
}

export function ServiceGraph(): JSX.Element {
  const services = useServiceStore((s) => s.services)
  const setSelectedServiceId = useAppStore((s) => s.setSelectedServiceId)
  const hasLayouted = useRef(false)

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => buildGraph(services),
    [services]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  // Update nodes/edges when services change, but only position on first layout
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildGraph(services)

    if (!hasLayouted.current) {
      setNodes(newNodes)
      hasLayouted.current = true
    } else {
      // Only update data, keep user-positioned nodes
      setNodes((current) =>
        current.map((node) => {
          const updated = newNodes.find((n) => n.id === node.id)
          if (updated) {
            return { ...node, data: updated.data }
          }
          return node
        })
      )
    }
    setEdges(newEdges)
  }, [services, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedServiceId(node.id)
    },
    [setSelectedServiceId]
  )

  const onPaneClick = useCallback(() => {
    setSelectedServiceId(null)
  }, [setSelectedServiceId])

  const handleReLayout = useCallback(() => {
    const { nodes: relayouted, edges: relayoutedEdges } = buildGraph(services)
    setNodes(relayouted)
    setEdges(relayoutedEdges)
  }, [services, setNodes, setEdges])

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#333" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const data = (node as ServiceNodeType).data
            return statusColors[data.status]
          }}
          maskColor="rgba(20, 20, 32, 0.8)"
          style={{ backgroundColor: '#1e1e2e' }}
        />
      </ReactFlow>

      {/* Re-layout button */}
      <button
        onClick={handleReLayout}
        className="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 border border-white/10 rounded-lg transition-colors"
        title="Re-layout graph"
      >
        Re-layout
      </button>
    </div>
  )
}

import { memo, useMemo } from 'react'
import { cleanTerminalOutput } from '@shared/strip-ansi'
import { useAgentTerminalStore } from '../../stores/agent-terminal-store'

interface AgentMiniTerminalProps {
  agentId: string
  lines?: number
}

export const AgentMiniTerminal = memo(function AgentMiniTerminal({ agentId, lines = 4 }: AgentMiniTerminalProps): JSX.Element {
  const buffer = useAgentTerminalStore((s) => s.buffers[agentId] || '')

  const displayLines = useMemo(() => {
    const cleaned = cleanTerminalOutput(buffer)
    const allLines = cleaned.split('\n').filter((l) => l.trim().length > 0)
    return allLines.slice(-lines)
  }, [buffer, lines])

  return (
    <div className="bg-surface-950 rounded px-2 py-1.5 font-mono text-[10px] leading-relaxed text-surface-400 overflow-hidden h-[68px]">
      {displayLines.length > 0 ? (
        displayLines.map((line, i) => (
          <div key={i} className="truncate">
            {line}
          </div>
        ))
      ) : (
        <div className="text-surface-600 italic">Waiting for output...</div>
      )}
    </div>
  )
})

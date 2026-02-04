import { useEffect } from 'react'
import { useAgentStore } from '../stores/agent-store'
import { useAgentTerminalStore } from '../stores/agent-terminal-store'
import type { AgentStatus, AgentInfo } from '@shared/agent-types'

export function useAgentIpcListeners(): void {
  const addAgent = useAgentStore((s) => s.addAgent)
  const updateStatus = useAgentStore((s) => s.updateStatus)
  const addSubagent = useAgentStore((s) => s.addSubagent)
  const setPrUrl = useAgentStore((s) => s.setPrUrl)
  const appendData = useAgentTerminalStore((s) => s.appendData)

  useEffect(() => {
    const unsubStatus = window.api.onAgentStatusChanged(
      (data: { agentId: string; status: string }) => {
        updateStatus(data.agentId, data.status as AgentStatus)
      }
    )

    const unsubExit = window.api.onAgentExit(
      (data: { agentId: string; exitCode: number | null }) => {
        // Status is already set by the status detector / process exit handler
        // This is just for additional cleanup if needed
        if (data.exitCode !== null && data.exitCode !== 0) {
          updateStatus(data.agentId, 'error')
        }
      }
    )

    const unsubSubagent = window.api.onAgentSubagentDetected(
      (data: { agentId: string; subagent: AgentInfo }) => {
        addSubagent(data.agentId, data.subagent)
      }
    )

    const unsubPr = window.api.onAgentPrDetected(
      (data: { agentId: string; prUrl: string }) => {
        setPrUrl(data.agentId, data.prUrl)
      }
    )

    const unsubTerminal = window.api.onAgentTerminalData(
      (data: { agentId: string; data: string }) => {
        appendData(data.agentId, data.data)
      }
    )

    return () => {
      unsubStatus()
      unsubExit()
      unsubSubagent()
      unsubPr()
      unsubTerminal()
    }
  }, [addAgent, updateStatus, addSubagent, setPrUrl, appendData])
}

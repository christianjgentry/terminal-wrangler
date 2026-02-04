import { useEffect } from 'react'
import { useAgentStore } from '../stores/agent-store'
import { useAgentTerminalStore } from '../stores/agent-terminal-store'
import { useGithubStore } from '../stores/github-store'
import type { AgentStatus, AgentInfo } from '@shared/agent-types'
import type { PrInfo } from '@shared/github-types'

export function useAgentIpcListeners(): void {
  const addAgent = useAgentStore((s) => s.addAgent)
  const updateStatus = useAgentStore((s) => s.updateStatus)
  const addSubagent = useAgentStore((s) => s.addSubagent)
  const setPrUrl = useAgentStore((s) => s.setPrUrl)
  const updateContextUsage = useAgentStore((s) => s.updateContextUsage)
  const appendData = useAgentTerminalStore((s) => s.appendData)
  const setPrInfo = useGithubStore((s) => s.setPrInfo)

  useEffect(() => {
    const unsubStatus = window.api.onAgentStatusChanged(
      (data: { agentId: string; status: string }) => {
        updateStatus(data.agentId, data.status as AgentStatus)
      }
    )

    const unsubExit = window.api.onAgentExit(
      (data: { agentId: string; exitCode: number | null }) => {
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

    const unsubContextUsage = window.api.onAgentContextUsage(
      (data: { agentId: string; used: number; max: number }) => {
        updateContextUsage(data.agentId, data.used, data.max)
      }
    )

    const unsubTerminal = window.api.onAgentTerminalData(
      (data: { agentId: string; data: string }) => {
        appendData(data.agentId, data.data)
      }
    )

    const unsubPrInfo = window.api.onGithubPrInfoUpdated(
      (data: { agentId: string; prInfo: PrInfo }) => {
        setPrInfo(data.agentId, data.prInfo)
      }
    )

    return () => {
      unsubStatus()
      unsubExit()
      unsubSubagent()
      unsubPr()
      unsubContextUsage()
      unsubTerminal()
      unsubPrInfo()
    }
  }, [addAgent, updateStatus, addSubagent, setPrUrl, updateContextUsage, appendData, setPrInfo])
}

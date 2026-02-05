import { useEffect } from 'react'
import { useAgentStore } from '../stores/agent-store'
import { useAgentTerminalStore } from '../stores/agent-terminal-store'
import { useGithubStore } from '../stores/github-store'
import { useNotificationStore } from '../stores/notification-store'
import type { AgentStatus, AgentInfo, AgentTask } from '@shared/agent-types'
import type { PrInfo } from '@shared/github-types'

export function useAgentIpcListeners(): void {
  const addAgent = useAgentStore((s) => s.addAgent)
  const updateStatus = useAgentStore((s) => s.updateStatus)
  const addSubagent = useAgentStore((s) => s.addSubagent)
  const setPrUrl = useAgentStore((s) => s.setPrUrl)
  const setPlanFilePath = useAgentStore((s) => s.setPlanFilePath)
  const updateContextUsage = useAgentStore((s) => s.updateContextUsage)
  const updateTasks = useAgentStore((s) => s.updateTasks)
  const setProcessAlive = useAgentStore((s) => s.setProcessAlive)
  const appendData = useAgentTerminalStore((s) => s.appendData)
  const setPrInfo = useGithubStore((s) => s.setPrInfo)
  const addNotification = useNotificationStore((s) => s.addNotification)

  useEffect(() => {
    const unsubStatus = window.api.onAgentStatusChanged(
      (data: { agentId: string; status: string }) => {
        updateStatus(data.agentId, data.status as AgentStatus)
      }
    )

    const unsubExit = window.api.onAgentExit(
      (data: { agentId: string; exitCode: number | null }) => {
        setProcessAlive(data.agentId, false)
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

    const unsubTasks = window.api.onAgentTasksChanged(
      (data: { agentId: string; tasks: AgentTask[] }) => {
        updateTasks(data.agentId, data.tasks)
      }
    )

    const unsubPlan = window.api.onAgentPlanDetected(
      (data: { agentId: string; planFilePath: string }) => {
        setPlanFilePath(data.agentId, data.planFilePath)
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

    const unsubInputNeeded = window.api.onAgentInputNeeded(
      (data: { agentId: string; agentName: string; prompt: string }) => {
        addNotification(data.agentId, data.agentName, data.prompt)
      }
    )

    return () => {
      unsubStatus()
      unsubExit()
      unsubSubagent()
      unsubPr()
      unsubContextUsage()
      unsubTasks()
      unsubTerminal()
      unsubPrInfo()
      unsubPlan()
      unsubInputNeeded()
    }
  }, [addAgent, updateStatus, addSubagent, setPrUrl, setPlanFilePath, updateContextUsage, updateTasks, setProcessAlive, appendData, setPrInfo, addNotification])
}

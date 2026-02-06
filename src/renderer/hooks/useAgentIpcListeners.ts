import { useEffect } from 'react'
import { useAgentStore } from '../stores/agent-store'
import { useAgentTerminalStore } from '../stores/agent-terminal-store'
import { useGithubStore } from '../stores/github-store'
import { useNotificationStore } from '../stores/notification-store'
import type { AgentStatus, AgentInfo, AgentTask } from '@shared/agent-types'
import type { PrInfo } from '@shared/github-types'

export function useAgentIpcListeners(): void {
  useEffect(() => {
    const unsubStatus = window.api.onAgentStatusChanged(
      (data: { agentId: string; status: string }) => {
        useAgentStore.getState().updateStatus(data.agentId, data.status as AgentStatus)
      }
    )

    const unsubExit = window.api.onAgentExit(
      (data: { agentId: string; exitCode: number | null }) => {
        useAgentStore.getState().setProcessAlive(data.agentId, false)
        if (data.exitCode !== null && data.exitCode !== 0) {
          useAgentStore.getState().updateStatus(data.agentId, 'error')
        }
      }
    )

    const unsubSubagent = window.api.onAgentSubagentDetected(
      (data: { agentId: string; subagent: AgentInfo }) => {
        useAgentStore.getState().addSubagent(data.agentId, data.subagent)
      }
    )

    const unsubPr = window.api.onAgentPrDetected(
      (data: { agentId: string; prUrl: string }) => {
        useAgentStore.getState().setPrUrl(data.agentId, data.prUrl)
      }
    )

    const unsubContextUsage = window.api.onAgentContextUsage(
      (data: { agentId: string; used: number; max: number }) => {
        useAgentStore.getState().updateContextUsage(data.agentId, data.used, data.max)
      }
    )

    const unsubTasks = window.api.onAgentTasksChanged(
      (data: { agentId: string; tasks: AgentTask[] }) => {
        useAgentStore.getState().updateTasks(data.agentId, data.tasks)
      }
    )

    const unsubPlan = window.api.onAgentPlanDetected(
      (data: { agentId: string; planFilePath: string }) => {
        useAgentStore.getState().setPlanFilePath(data.agentId, data.planFilePath)
      }
    )

    const unsubTerminal = window.api.onAgentTerminalData(
      (data: { agentId: string; data: string }) => {
        useAgentTerminalStore.getState().appendData(data.agentId, data.data)
      }
    )

    const unsubPrInfo = window.api.onGithubPrInfoUpdated(
      (data: { agentId: string; prInfo: PrInfo }) => {
        useGithubStore.getState().setPrInfo(data.agentId, data.prInfo)
      }
    )

    const unsubInputNeeded = window.api.onAgentInputNeeded(
      (data: { agentId: string; agentName: string; prompt: string }) => {
        useNotificationStore.getState().addNotification(data.agentId, data.agentName, data.prompt)
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
  }, [])
}

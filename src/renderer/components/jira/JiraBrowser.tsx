import { useEffect } from 'react'
import { useJiraStore } from '../../stores/jira-store'
import { JiraConnectionSetup } from './JiraConnectionSetup'
import { JiraProjectSelector } from './JiraProjectSelector'
import { JiraConnectionHeader } from './JiraConnectionHeader'
import { JiraEpicList } from './JiraEpicList'
import { JiraStoryDetail } from './JiraStoryDetail'
import { JiraSpawnDialog } from './JiraSpawnDialog'
import { PlannerView } from '../planner/PlannerView'
import { DiscoveryView } from '../discovery/DiscoveryView'
import type { JiraMode } from '../../stores/jira-store'

export function JiraBrowser(): JSX.Element {
  const connectionStatus = useJiraStore((s) => s.connectionStatus)
  const selectedProjectKey = useJiraStore((s) => s.selectedProjectKey)
  const fetchCredentials = useJiraStore((s) => s.fetchCredentials)
  const spawnDialogOpen = useJiraStore((s) => s.spawnDialogOpen)
  const jiraMode = useJiraStore((s) => s.jiraMode)
  const setJiraMode = useJiraStore((s) => s.setJiraMode)

  // Load credentials on mount
  useEffect(() => {
    fetchCredentials()
  }, [fetchCredentials])

  // Planner mode is always accessible (doesn't require Jira connection)
  if (jiraMode === 'planner') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ModeToggle mode={jiraMode} onModeChange={setJiraMode} />
        <PlannerView />
      </div>
    )
  }

  // Discovery mode is always accessible (doesn't require Jira connection)
  if (jiraMode === 'discovery') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ModeToggle mode={jiraMode} onModeChange={setJiraMode} />
        <DiscoveryView />
      </div>
    )
  }

  // Not connected → show setup
  if (connectionStatus !== 'connected') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ModeToggle mode={jiraMode} onModeChange={setJiraMode} />
        <JiraConnectionSetup />
      </div>
    )
  }

  // No project selected → show project selector
  if (!selectedProjectKey) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ModeToggle mode={jiraMode} onModeChange={setJiraMode} />
        <JiraProjectSelector />
      </div>
    )
  }

  // Connected with project → show epic/story browser
  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        <ModeToggle mode={jiraMode} onModeChange={setJiraMode} />
        <JiraConnectionHeader />
        <div className="flex-1 flex overflow-hidden">
          <JiraEpicList />
          <JiraStoryDetail />
        </div>
      </div>
      {spawnDialogOpen && <JiraSpawnDialog />}
    </>
  )
}

function ModeToggle({
  mode,
  onModeChange
}: {
  mode: JiraMode
  onModeChange: (mode: JiraMode) => void
}): JSX.Element {
  return (
    <div className="flex items-center gap-0.5 px-4 py-2 bg-surface-800/50 border-b border-white/5">
      <div className="flex items-center gap-0.5 bg-surface-800 rounded-lg p-0.5">
        <button
          onClick={() => onModeChange('browse')}
          className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${
            mode === 'browse'
              ? 'text-white bg-surface-700'
              : 'text-surface-400 hover:text-surface-300'
          }`}
        >
          Browse
        </button>
        <button
          onClick={() => onModeChange('planner')}
          className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${
            mode === 'planner'
              ? 'text-white bg-surface-700'
              : 'text-surface-400 hover:text-surface-300'
          }`}
        >
          Planner
        </button>
        <button
          onClick={() => onModeChange('discovery')}
          className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${
            mode === 'discovery'
              ? 'text-white bg-surface-700'
              : 'text-surface-400 hover:text-surface-300'
          }`}
        >
          Discovery
        </button>
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { useJiraStore } from '../../stores/jira-store'
import { JiraConnectionSetup } from './JiraConnectionSetup'
import { JiraProjectSelector } from './JiraProjectSelector'
import { JiraEpicList } from './JiraEpicList'
import { JiraStoryDetail } from './JiraStoryDetail'
import { JiraSpawnDialog } from './JiraSpawnDialog'

export function JiraBrowser(): JSX.Element {
  const connectionStatus = useJiraStore((s) => s.connectionStatus)
  const selectedProjectKey = useJiraStore((s) => s.selectedProjectKey)
  const fetchCredentials = useJiraStore((s) => s.fetchCredentials)
  const spawnDialogOpen = useJiraStore((s) => s.spawnDialogOpen)

  // Load credentials on mount
  useEffect(() => {
    fetchCredentials()
  }, [fetchCredentials])

  // Not connected → show setup
  if (connectionStatus !== 'connected') {
    return <JiraConnectionSetup />
  }

  // No project selected → show project selector
  if (!selectedProjectKey) {
    return <JiraProjectSelector />
  }

  // Connected with project → show epic/story browser
  return (
    <>
      <div className="flex-1 flex overflow-hidden">
        <JiraEpicList />
        <JiraStoryDetail />
      </div>
      {spawnDialogOpen && <JiraSpawnDialog />}
    </>
  )
}

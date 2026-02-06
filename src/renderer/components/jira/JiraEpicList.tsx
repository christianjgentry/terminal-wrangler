import { useMemo } from 'react'
import { useJiraStore } from '../../stores/jira-store'
import { JiraEpicCard } from './JiraEpicCard'

const DONE_STATUSES = ['done', 'closed', 'resolved']

export function JiraEpicList(): JSX.Element {
  const epics = useJiraStore((s) => s.epics)
  const loading = useJiraStore((s) => s.loading)
  const error = useJiraStore((s) => s.error)
  const showDone = useJiraStore((s) => s.showDone)

  const filteredEpics = useMemo(
    () => epics.filter((e) => showDone || !DONE_STATUSES.includes(e.status.toLowerCase())),
    [epics, showDone]
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-surface-500">Loading epics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 max-w-xs text-center">
          {error}
        </div>
      </div>
    )
  }

  if (epics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-surface-500">No epics found in this project</span>
      </div>
    )
  }

  if (filteredEpics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-surface-500">All epics are done — enable "Show Done" to see them</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {filteredEpics.map((epic) => (
        <JiraEpicCard key={epic.key} epic={epic} />
      ))}
    </div>
  )
}

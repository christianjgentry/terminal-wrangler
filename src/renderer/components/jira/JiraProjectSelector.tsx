import { useState, useCallback } from 'react'
import { useJiraStore } from '../../stores/jira-store'

export function JiraProjectSelector(): JSX.Element {
  const setSelectedProjectKey = useJiraStore((s) => s.setSelectedProjectKey)
  const fetchEpics = useJiraStore((s) => s.fetchEpics)

  const [projectKey, setProjectKey] = useState('')

  const handleSubmit = useCallback(async () => {
    const key = projectKey.trim().toUpperCase()
    if (!key) return
    setSelectedProjectKey(key)
    await window.api.setJiraProjectKey(key)
    fetchEpics(key)
  }, [projectKey, setSelectedProjectKey, fetchEpics])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-surface-800 border border-white/10 rounded-xl w-[360px] p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-200">Select Project</h2>
          <p className="text-[10px] text-surface-500 mt-1">
            Enter the Jira project key to browse its epics and stories.
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
            Project Key
          </label>
          <input
            type="text"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. PROJ"
            className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-accent/50 font-mono uppercase"
            autoFocus
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!projectKey.trim()}
          className="w-full px-3 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Load Epics
        </button>
      </div>
    </div>
  )
}

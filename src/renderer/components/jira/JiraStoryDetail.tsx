import { useCallback } from 'react'
import { useJiraStore } from '../../stores/jira-store'

export function JiraStoryDetail(): JSX.Element | null {
  const story = useJiraStore((s) => s.selectedStoryDetail)
  const setSelectedStoryDetail = useJiraStore((s) => s.setSelectedStoryDetail)
  const selectedStoryKeys = useJiraStore((s) => s.selectedStoryKeys)
  const toggleStorySelection = useJiraStore((s) => s.toggleStorySelection)
  const setSpawnDialogOpen = useJiraStore((s) => s.setSpawnDialogOpen)

  const handleSpawnSingle = useCallback(() => {
    if (!story) return
    if (!selectedStoryKeys.has(story.key)) {
      toggleStorySelection(story.key)
    }
    setSpawnDialogOpen(true)
  }, [story, selectedStoryKeys, toggleStorySelection, setSpawnDialogOpen])

  if (!story) return null

  return (
    <div className="w-[320px] border-l border-white/5 bg-surface-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-accent-light">{story.key}</span>
          <span className="text-[9px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">
            {story.status}
          </span>
        </div>
        <button
          onClick={() => setSelectedStoryDetail(null)}
          className="text-surface-400 hover:text-white transition-colors text-sm leading-none"
        >
          &times;
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-surface-200">{story.summary}</h3>
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-surface-500 uppercase tracking-wider">Type</span>
            <span className="text-xs text-surface-300">{story.issueType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-surface-500 uppercase tracking-wider">Priority</span>
            <span className="text-xs text-surface-300">{story.priority}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-surface-500 uppercase tracking-wider">Assignee</span>
            <span className="text-xs text-surface-300">{story.assignee}</span>
          </div>
          {story.labels.length > 0 && (
            <div>
              <span className="text-[10px] text-surface-500 uppercase tracking-wider block mb-1">Labels</span>
              <div className="flex flex-wrap gap-1">
                {story.labels.map((label) => (
                  <span
                    key={label}
                    className="text-[9px] text-surface-400 bg-surface-700 px-1.5 py-0.5 rounded"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {story.description && (
          <div>
            <span className="text-[10px] text-surface-500 uppercase tracking-wider block mb-1.5">
              Description
            </span>
            <div className="text-xs text-surface-400 whitespace-pre-wrap leading-relaxed bg-surface-800 rounded-lg p-3 border border-white/5 max-h-[300px] overflow-y-auto">
              {story.description}
            </div>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="px-4 py-3 border-t border-white/5">
        <button
          onClick={handleSpawnSingle}
          className="w-full px-3 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors"
        >
          Spawn Agent
        </button>
      </div>
    </div>
  )
}

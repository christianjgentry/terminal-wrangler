import type { JiraStory } from '@shared/jira-types'
import { useJiraStore } from '../../stores/jira-store'

interface JiraStoryCardProps {
  story: JiraStory
}

const priorityColors: Record<string, string> = {
  Highest: 'text-red-400',
  High: 'text-orange-400',
  Medium: 'text-yellow-400',
  Low: 'text-blue-400',
  Lowest: 'text-surface-500'
}

export function JiraStoryCard({ story }: JiraStoryCardProps): JSX.Element {
  const selectedStoryKeys = useJiraStore((s) => s.selectedStoryKeys)
  const toggleStorySelection = useJiraStore((s) => s.toggleStorySelection)
  const setSelectedStoryDetail = useJiraStore((s) => s.setSelectedStoryDetail)

  const isSelected = selectedStoryKeys.has(story.key)
  const priorityColor = priorityColors[story.priority] || 'text-surface-500'

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
        isSelected
          ? 'border-accent/30 bg-accent/5'
          : 'border-white/5 bg-surface-800 hover:border-white/10'
      }`}
      onClick={() => setSelectedStoryDetail(story)}
    >
      {/* Checkbox */}
      <label
        className="flex-shrink-0 mt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleStorySelection(story.key)}
          className="w-3.5 h-3.5 rounded border-white/20 bg-surface-700 text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </label>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-accent-light">{story.key}</span>
          <span className="text-[9px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">
            {story.status}
          </span>
        </div>
        <p className="text-xs text-surface-300 mt-0.5 line-clamp-1">{story.summary}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] ${priorityColor}`}>{story.priority}</span>
          <span className="text-[9px] text-surface-500">{story.assignee}</span>
          <span className="text-[9px] text-surface-600 bg-surface-700 px-1 rounded">{story.issueType}</span>
        </div>
      </div>
    </div>
  )
}

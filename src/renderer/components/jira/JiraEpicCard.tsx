import { useCallback, useEffect, useMemo } from 'react'
import type { JiraEpic } from '@shared/jira-types'
import { useJiraStore } from '../../stores/jira-store'
import { JiraStoryCard } from './JiraStoryCard'

const DONE_STATUSES = ['done', 'closed', 'resolved']

interface JiraEpicCardProps {
  epic: JiraEpic
}

export function JiraEpicCard({ epic }: JiraEpicCardProps): JSX.Element {
  const expandedEpicKey = useJiraStore((s) => s.expandedEpicKey)
  const setExpandedEpicKey = useJiraStore((s) => s.setExpandedEpicKey)
  const storiesByEpic = useJiraStore((s) => s.storiesByEpic)
  const fetchStoriesForEpic = useJiraStore((s) => s.fetchStoriesForEpic)
  const selectAllStoriesForEpic = useJiraStore((s) => s.selectAllStoriesForEpic)
  const setSpawnDialogOpen = useJiraStore((s) => s.setSpawnDialogOpen)
  const showDone = useJiraStore((s) => s.showDone)

  const isExpanded = expandedEpicKey === epic.key
  const stories = storiesByEpic[epic.key]
  const filteredStories = useMemo(
    () => stories?.filter((s) => showDone || !DONE_STATUSES.includes(s.status.toLowerCase())),
    [stories, showDone]
  )
  const storyCount = epic.storyCount ?? filteredStories?.length

  // Lazy-load stories when expanding
  useEffect(() => {
    if (isExpanded && !stories) {
      fetchStoriesForEpic(epic.key)
    }
  }, [isExpanded, stories, epic.key, fetchStoriesForEpic])

  const handleToggle = useCallback(() => {
    setExpandedEpicKey(isExpanded ? null : epic.key)
  }, [isExpanded, epic.key, setExpandedEpicKey])

  const handleSpawnAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      selectAllStoriesForEpic(epic.key)
      setSpawnDialogOpen(true)
    },
    [epic.key, selectAllStoriesForEpic, setSpawnDialogOpen]
  )

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      {/* Epic header (accordion toggle) */}
      <div
        className="flex items-center justify-between px-3 py-2.5 bg-surface-800 hover:bg-surface-750 cursor-pointer transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-surface-500 select-none">
            {isExpanded ? '\u25BC' : '\u25B6'}
          </span>
          <span className="text-[10px] font-mono text-accent-light">{epic.key}</span>
          <span className="text-xs text-surface-200 truncate">{epic.summary}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-[9px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">
            {epic.status}
          </span>
          {storyCount !== undefined && (
            <span className="text-[9px] text-surface-500">
              {storyCount} {storyCount === 1 ? 'story' : 'stories'}
            </span>
          )}
          <button
            onClick={handleSpawnAll}
            className="px-2 py-0.5 text-[9px] font-medium text-accent-light hover:text-white bg-accent/10 hover:bg-accent/20 rounded transition-colors"
          >
            Spawn All
          </button>
        </div>
      </div>

      {/* Expanded stories */}
      {isExpanded && (
        <div className="px-3 py-2 space-y-1.5 bg-surface-850">
          {!stories ? (
            <div className="text-[10px] text-surface-500 py-2 text-center">Loading stories...</div>
          ) : filteredStories!.length === 0 ? (
            <div className="text-[10px] text-surface-500 py-2 text-center">
              {stories.length > 0 ? 'All stories are done' : 'No stories found'}
            </div>
          ) : (
            filteredStories!.map((story) => (
              <JiraStoryCard key={story.key} story={story} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useCallback, useEffect } from 'react'
import { useJiraStore } from '../../stores/jira-store'
import { useAgentStore } from '../../stores/agent-store'
import { useAppStore } from '../../stores/app-store'

interface StoryTask {
  key: string
  summary: string
  task: string
}

function generateTaskPrompt(story: { key: string; summary: string; description: string; priority: string; labels: string[] }): string {
  let prompt = `Implement Jira story ${story.key}: ${story.summary}`
  if (story.description) {
    prompt += `\n\nDescription:\n${story.description}`
  }
  prompt += `\n\nPriority: ${story.priority}`
  if (story.labels.length > 0) {
    prompt += `\nLabels: ${story.labels.join(', ')}`
  }
  return prompt
}

export function JiraSpawnDialog(): JSX.Element {
  const projectPath = useAppStore((s) => s.projectPath)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const addAgent = useAgentStore((s) => s.addAgent)
  const getSelectedStories = useJiraStore((s) => s.getSelectedStories)
  const setSpawnDialogOpen = useJiraStore((s) => s.setSpawnDialogOpen)
  const clearStorySelection = useJiraStore((s) => s.clearStorySelection)

  const selectedStories = getSelectedStories()

  const [storyTasks, setStoryTasks] = useState<StoryTask[]>([])
  const [cwd, setCwd] = useState(projectPath || '')
  const [planMode, setPlanMode] = useState(false)
  const [createBranch, setCreateBranch] = useState(true)
  const [includeDiscovery, setIncludeDiscovery] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStoryTasks(
      selectedStories.map((s) => ({
        key: s.key,
        summary: s.summary,
        task: generateTaskPrompt(s)
      }))
    )
  }, []) // Only on mount

  const handleClose = useCallback(() => {
    setSpawnDialogOpen(false)
  }, [setSpawnDialogOpen])

  const handleTaskChange = useCallback((key: string, newTask: string) => {
    setStoryTasks((prev) =>
      prev.map((st) => (st.key === key ? { ...st, task: newTask } : st))
    )
  }, [])

  const handleCreate = useCallback(async () => {
    if (storyTasks.length === 0 || !cwd.trim()) return
    setCreating(true)
    setError(null)

    try {
      let discoveryFiles: string[] | undefined
      let discoveryLinkText = ''
      if (includeDiscovery && projectPath) {
        const ctx = await window.api.buildDiscoveryContext(projectPath)
        if (ctx.filePaths.length > 0) discoveryFiles = ctx.filePaths
        if (ctx.linkPromptText) discoveryLinkText = ctx.linkPromptText
      }

      for (const st of storyTasks) {
        const branchName = st.key.toLowerCase()
        const taskText = discoveryLinkText ? st.task + discoveryLinkText : st.task
        const agent = await window.api.createAgent({
          name: `${st.key}: ${st.summary}`,
          task: taskText,
          cwd: cwd.trim(),
          files: discoveryFiles,
          planMode: planMode || undefined,
          createBranch: createBranch || undefined,
          branchName: createBranch ? branchName : undefined,
          jiraIssueKey: st.key
        })
        addAgent(agent)
      }
      clearStorySelection()
      handleClose()
      setActiveView('agents')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setCreating(false)
    }
  }, [storyTasks, cwd, planMode, createBranch, includeDiscovery, projectPath, addAgent, clearStorySelection, handleClose, setActiveView])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleCreate()
      }
      if (e.key === 'Escape') {
        handleClose()
      }
    },
    [handleCreate, handleClose]
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div
        className="bg-surface-900 border border-white/10 rounded-xl w-[560px] shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-surface-200">
            Spawn Agents ({storyTasks.length} {storyTasks.length === 1 ? 'story' : 'stories'})
          </h2>
          <button
            onClick={handleClose}
            className="text-surface-400 hover:text-white transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Story tasks */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {storyTasks.map((st) => (
            <div key={st.key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-accent-light">{st.key}</span>
                <span className="text-xs text-surface-300 truncate">{st.summary}</span>
              </div>
              <textarea
                value={st.task}
                onChange={(e) => handleTaskChange(st.key, e.target.value)}
                rows={3}
                className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-accent/50 resize-none font-mono"
              />
            </div>
          ))}

          {/* Options */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            {/* Plan Mode Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
                Plan first
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={planMode}
                onClick={() => setPlanMode((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  planMode ? 'bg-accent' : 'bg-surface-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    planMode ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
            </div>

            {/* Git Branch Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
                Create branches
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={createBranch}
                onClick={() => setCreateBranch((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  createBranch ? 'bg-accent' : 'bg-surface-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    createBranch ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
            </div>

            {/* Include Discovery Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
                Include Discovery
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={includeDiscovery}
                onClick={() => setIncludeDiscovery((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  includeDiscovery ? 'bg-accent' : 'bg-surface-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    includeDiscovery ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
            </div>

            {/* Working Directory */}
            <div>
              <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
                Working Directory
              </label>
              <input
                type="text"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-accent/50 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mb-0 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/5">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || storyTasks.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : `Create ${storyTasks.length} Agent${storyTasks.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

import { usePlannerStore } from '../../stores/planner-store'
import { useJiraStore } from '../../stores/jira-store'

export function FeatureInputPanel(): JSX.Element {
  const featureDescription = usePlannerStore((s) => s.featureDescription)
  const setFeatureDescription = usePlannerStore((s) => s.setFeatureDescription)
  const includeConfluence = usePlannerStore((s) => s.includeConfluence)
  const setIncludeConfluence = usePlannerStore((s) => s.setIncludeConfluence)
  const spawnPlannerAgent = usePlannerStore((s) => s.spawnPlannerAgent)
  const spawning = usePlannerStore((s) => s.spawning)
  const error = usePlannerStore((s) => s.error)

  const jiraProjectKey = useJiraStore((s) => s.selectedProjectKey)

  const handleSpawn = (): void => {
    spawnPlannerAgent(jiraProjectKey || undefined)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
      {/* Feature description */}
      <div className="flex-1 flex flex-col min-h-0">
        <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
          Describe Your Feature
        </label>
        <textarea
          value={featureDescription}
          onChange={(e) => setFeatureDescription(e.target.value)}
          placeholder="Describe the feature you want to plan and create Jira artifacts for..."
          className="flex-1 w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-accent/50 resize-none"
        />
      </div>

      {/* Options */}
      <div className="space-y-3 border-t border-white/5 pt-3">
        {/* Project key display */}
        {jiraProjectKey && (
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
              Jira Project
            </label>
            <span className="text-[10px] font-mono text-accent-light bg-accent/10 px-2 py-0.5 rounded">
              {jiraProjectKey}
            </span>
          </div>
        )}

        {/* Include Confluence toggle */}
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
            Include Confluence docs
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={includeConfluence}
            onClick={() => setIncludeConfluence(!includeConfluence)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              includeConfluence ? 'bg-accent' : 'bg-surface-700'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                includeConfluence ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Spawn button */}
      <button
        onClick={handleSpawn}
        disabled={spawning || !featureDescription.trim()}
        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {spawning ? 'Spawning Agent...' : 'Plan to Jira'}
      </button>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { usePlannerStore } from '../../stores/planner-store'
import { createRendererLogger } from '../../lib/logger'

const logger = createRendererLogger('StandardsDirDialog')

export function StandardsDirDialog(): JSX.Element {
  const currentDir = usePlannerStore((s) => s.standardsDir)
  const setStandardsDir = usePlannerStore((s) => s.setStandardsDir)
  const setDirDialogOpen = usePlannerStore((s) => s.setDirDialogOpen)

  const [dirPath, setDirPath] = useState(currentDir)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    setDirDialogOpen(false)
  }, [setDirDialogOpen])

  const handleBrowse = useCallback(async () => {
    try {
      const selected = await window.api.openProject()
      if (selected) {
        setDirPath(selected)
      }
    } catch (err) {
      logger.error('Failed to open directory dialog:', err)
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!dirPath.trim()) return
    setSaving(true)
    setError(null)
    try {
      await setStandardsDir(dirPath.trim())
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }, [dirPath, setStandardsDir, handleClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave()
      }
      if (e.key === 'Escape') {
        handleClose()
      }
    },
    [handleSave, handleClose]
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div
        className="bg-surface-900 border border-white/10 rounded-xl w-[440px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-surface-200">Standards Directory</h2>
          <button
            onClick={handleClose}
            className="text-surface-400 hover:text-white transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-surface-400">
            Choose the directory containing your planning standards and SKILL.md prompt.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              placeholder="~/.claude/commands/translate-to-jira/"
              className="flex-1 bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-accent/50 font-mono"
              autoFocus
            />
            <button
              onClick={handleBrowse}
              className="px-3 py-2 text-xs font-medium text-surface-400 bg-surface-800 hover:bg-surface-700 border border-white/10 rounded-lg transition-colors shrink-0"
            >
              Browse
            </button>
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/5">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirPath.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

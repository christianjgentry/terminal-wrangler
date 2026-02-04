import { useState, useCallback } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useAgentStore } from '../../stores/agent-store'

interface AgentCreateDialogProps {
  open: boolean
  onClose: () => void
}

export function AgentCreateDialog({ open, onClose }: AgentCreateDialogProps): JSX.Element | null {
  const projectPath = useAppStore((s) => s.projectPath)
  const addAgent = useAgentStore((s) => s.addAgent)

  const [name, setName] = useState('')
  const [task, setTask] = useState('')
  const [cwd, setCwd] = useState(projectPath || '')
  const [creating, setCreating] = useState(false)

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !task.trim() || !cwd.trim()) return

    setCreating(true)
    try {
      const agent = await window.api.createAgent({
        name: name.trim(),
        task: task.trim(),
        cwd: cwd.trim()
      })
      addAgent(agent)
      setName('')
      setTask('')
      setCwd(projectPath || '')
      onClose()
    } catch (err) {
      console.error('Failed to create agent:', err)
    } finally {
      setCreating(false)
    }
  }, [name, task, cwd, projectPath, addAgent, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleCreate()
      }
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [handleCreate, onClose]
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-surface-900 border border-white/10 rounded-xl w-[480px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-surface-200">New Agent</h2>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-white transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Auth Feature"
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-accent/50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
              Task
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe the task for the Claude Code agent..."
              rows={4}
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-accent/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
              Working Directory
            </label>
            <input
              type="text"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-accent/50 font-mono text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !task.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  )
}

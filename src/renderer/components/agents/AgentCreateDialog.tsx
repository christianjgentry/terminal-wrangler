import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useAgentStore } from '../../stores/agent-store'
import { createRendererLogger } from '../../lib/logger'
import { generateBranchName } from '@shared/branch-utils'

const logger = createRendererLogger('AgentCreateDialog')

interface AgentCreateDialogProps {
  open: boolean
  onClose: () => void
}

function displayPath(filePath: string, cwd: string): string {
  if (cwd && filePath.startsWith(cwd + '/')) {
    return filePath.slice(cwd.length + 1)
  }
  return filePath.split('/').pop() || filePath
}

export function AgentCreateDialog({ open, onClose }: AgentCreateDialogProps): JSX.Element | null {
  const projectPath = useAppStore((s) => s.projectPath)
  const addAgent = useAgentStore((s) => s.addAgent)

  const [name, setName] = useState('')
  const [task, setTask] = useState('')
  const [cwd, setCwd] = useState(projectPath || '')
  const [files, setFiles] = useState<string[]>([])
  const [includeDiscovery, setIncludeDiscovery] = useState(false)
  const [planMode, setPlanMode] = useState(false)
  const [createBranch, setCreateBranch] = useState(false)
  const [branchName, setBranchName] = useState('')
  const [branchEdited, setBranchEdited] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (!branchEdited) {
      setBranchName(generateBranchName(name))
    }
  }, [name, branchEdited])

  const addFiles = useCallback((paths: string[]) => {
    setFiles((prev) => {
      const existing = new Set(prev)
      const newPaths = paths.filter((p) => !existing.has(p))
      return newPaths.length > 0 ? [...prev, ...newPaths] : prev
    })
  }, [])

  const removeFile = useCallback((path: string) => {
    setFiles((prev) => prev.filter((f) => f !== path))
  }, [])

  const handleBrowse = useCallback(async () => {
    try {
      const selected = await window.api.openFileDialog(cwd || undefined)
      if (selected) {
        addFiles(selected)
      }
    } catch (err) {
      logger.error('Failed to open file dialog:', err)
    }
  }, [cwd, addFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)

      const droppedFiles = e.dataTransfer.files
      const paths: string[] = []
      for (let i = 0; i < droppedFiles.length; i++) {
        const path = window.api.getPathForFile(droppedFiles[i])
        if (path) paths.push(path)
      }
      if (paths.length > 0) {
        addFiles(paths)
      }
    },
    [addFiles]
  )

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !task.trim() || !cwd.trim()) return

    setCreating(true)
    setError(null)
    try {
      let finalTask = task.trim()
      let finalFiles = files.length > 0 ? [...files] : undefined

      if (includeDiscovery && projectPath) {
        const ctx = await window.api.buildDiscoveryContext(projectPath)
        if (ctx.filePaths.length > 0) {
          finalFiles = [...(finalFiles || []), ...ctx.filePaths]
        }
        if (ctx.linkPromptText) {
          finalTask += ctx.linkPromptText
        }
      }

      const agent = await window.api.createAgent({
        name: name.trim(),
        task: finalTask,
        cwd: cwd.trim(),
        files: finalFiles,
        planMode: planMode || undefined,
        createBranch: createBranch || undefined,
        branchName: createBranch ? branchName : undefined
      })
      addAgent(agent)
      setName('')
      setTask('')
      setCwd(projectPath || '')
      setFiles([])
      setIncludeDiscovery(false)
      setPlanMode(false)
      setCreateBranch(false)
      setBranchName('')
      setBranchEdited(false)
      setError(null)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setCreating(false)
    }
  }, [name, task, cwd, files, includeDiscovery, planMode, createBranch, branchName, projectPath, addAgent, onClose])

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
        className="bg-surface-900 border border-white/10 rounded-xl w-[480px] shadow-2xl max-h-[90vh] flex flex-col"
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
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
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

          {/* Context Files */}
          <div>
            <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
              Context Files
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed rounded-lg px-3 py-3 text-center transition-colors ${
                dragOver
                  ? 'border-accent bg-accent/10'
                  : 'border-white/10 bg-surface-800'
              }`}
            >
              <p className="text-xs text-surface-500 mb-2">
                Drop files here or{' '}
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="text-accent hover:text-accent-light underline"
                >
                  browse
                </button>
              </p>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 justify-start">
                  {files.map((filePath) => (
                    <span
                      key={filePath}
                      title={filePath}
                      className="inline-flex items-center gap-1 bg-surface-700 text-surface-300 text-[11px] font-mono px-2 py-0.5 rounded-md max-w-[200px]"
                    >
                      <span className="truncate">{displayPath(filePath, cwd)}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(filePath)}
                        className="text-surface-500 hover:text-white flex-shrink-0 ml-0.5"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Git Branch Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
                Git Branch
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
            {createBranch && (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => {
                    setBranchName(e.target.value)
                    setBranchEdited(true)
                  }}
                  className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-accent/50 font-mono text-xs"
                />
                <p className="text-[10px] text-surface-500">Branch will be created from main</p>
              </div>
            )}
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

        {/* Error banner */}
        {error && (
          <div className="mx-5 mb-0 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

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

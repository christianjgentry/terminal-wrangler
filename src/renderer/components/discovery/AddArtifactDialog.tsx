import { useState, useCallback } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useDiscoveryStore } from '../../stores/discovery-store'

export function AddArtifactDialog(): JSX.Element {
  const projectPath = useAppStore((s) => s.projectPath)
  const addFiles = useDiscoveryStore((s) => s.addFiles)
  const setAddFileDialogOpen = useDiscoveryStore((s) => s.setAddFileDialogOpen)

  const [files, setFiles] = useState<string[]>([])
  const [subfolder, setSubfolder] = useState('')
  const [tags, setTags] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [adding, setAdding] = useState(false)

  const handleClose = useCallback(() => {
    setAddFileDialogOpen(false)
  }, [setAddFileDialogOpen])

  const addPaths = useCallback((paths: string[]) => {
    setFiles((prev) => {
      const existing = new Set(prev)
      const newPaths = paths.filter((p) => !existing.has(p))
      return newPaths.length > 0 ? [...prev, ...newPaths] : prev
    })
  }, [])

  const removePath = useCallback((path: string) => {
    setFiles((prev) => prev.filter((f) => f !== path))
  }, [])

  const handleBrowse = useCallback(async () => {
    const selected = await window.api.openFileDialog(projectPath || undefined)
    if (selected) {
      addPaths(selected)
    }
  }, [projectPath, addPaths])

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
        addPaths(paths)
      }
    },
    [addPaths]
  )

  const handleAdd = useCallback(async () => {
    if (!projectPath || files.length === 0) return
    setAdding(true)
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    await addFiles(projectPath, {
      sourcePaths: files,
      subfolder: subfolder.trim() || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined
    })
    setAdding(false)
  }, [projectPath, files, subfolder, tags, addFiles])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleAdd()
      }
      if (e.key === 'Escape') {
        handleClose()
      }
    },
    [handleAdd, handleClose]
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div
        className="bg-surface-900 border border-white/10 rounded-xl w-[480px] shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-surface-200">Add File Artifacts</h2>
          <button
            onClick={handleClose}
            className="text-surface-400 hover:text-white transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* File picker zone */}
          <div>
            <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
              Files
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
                      <span className="truncate">{filePath.split('/').pop()}</span>
                      <button
                        type="button"
                        onClick={() => removePath(filePath)}
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

          {/* Subfolder */}
          <div>
            <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
              Subfolder (optional)
            </label>
            <input
              type="text"
              value={subfolder}
              onChange={(e) => setSubfolder(e.target.value)}
              placeholder="e.g. transcripts"
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-accent/50 font-mono"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
              Tags (optional, comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. call-notes, discovery"
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-accent/50"
            />
          </div>
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
            onClick={handleAdd}
            disabled={adding || files.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : `Add ${files.length} File${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

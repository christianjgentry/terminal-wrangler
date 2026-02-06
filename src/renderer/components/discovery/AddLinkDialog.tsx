import { useState, useCallback, useMemo } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useDiscoveryStore } from '../../stores/discovery-store'

function detectLinkType(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('figma.com')) return 'figma'
    if (host.includes('miro.com')) return 'miro'
    if (host.includes('docs.google.com')) return 'google-doc'
  } catch {
    // invalid URL
  }
  return undefined
}

function linkTypeBadgeColor(linkType?: string): string {
  switch (linkType) {
    case 'figma': return 'bg-purple-500/20 text-purple-300'
    case 'miro': return 'bg-yellow-500/20 text-yellow-300'
    case 'google-doc': return 'bg-blue-500/20 text-blue-300'
    default: return ''
  }
}

export function AddLinkDialog(): JSX.Element {
  const projectPath = useAppStore((s) => s.projectPath)
  const addLink = useDiscoveryStore((s) => s.addLink)
  const setAddLinkDialogOpen = useDiscoveryStore((s) => s.setAddLinkDialogOpen)

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [adding, setAdding] = useState(false)

  const detectedType = useMemo(() => detectLinkType(url), [url])

  const handleClose = useCallback(() => {
    setAddLinkDialogOpen(false)
  }, [setAddLinkDialogOpen])

  const handleAdd = useCallback(async () => {
    if (!projectPath || !name.trim() || !url.trim()) return
    setAdding(true)
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    await addLink(projectPath, {
      name: name.trim(),
      url: url.trim(),
      description: description.trim() || undefined,
      linkType: detectedType as 'figma' | 'miro' | 'google-doc' | undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined
    })
    setAdding(false)
  }, [projectPath, name, url, description, tags, detectedType, addLink])

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
        className="bg-surface-900 border border-white/10 rounded-xl w-[440px] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-surface-200">Add Link</h2>
          <button
            onClick={handleClose}
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
              placeholder="e.g. Design Mockups"
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-accent/50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
              URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-accent/50 font-mono"
              />
              {detectedType && (
                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${linkTypeBadgeColor(detectedType)}`}>
                  {detectedType}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this resource"
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-surface-600 focus:outline-none focus:border-accent/50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
              Tags (optional, comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. design, ux"
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
            disabled={adding || !name.trim() || !url.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : 'Add Link'}
          </button>
        </div>
      </div>
    </div>
  )
}

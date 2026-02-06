import { useDiscoveryStore } from '../../stores/discovery-store'
import { useAppStore } from '../../stores/app-store'
import type { AnyArtifact, FileArtifact, LinkArtifact } from '@shared/discovery-types'

function FileIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-surface-400 flex-shrink-0">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function LinkIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-surface-400 flex-shrink-0">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function linkTypeBadgeColor(linkType?: string): string {
  switch (linkType) {
    case 'figma': return 'bg-purple-500/20 text-purple-300'
    case 'miro': return 'bg-yellow-500/20 text-yellow-300'
    case 'google-doc': return 'bg-blue-500/20 text-blue-300'
    default: return 'bg-surface-700 text-surface-400'
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ArtifactItem({ artifact }: { artifact: AnyArtifact }): JSX.Element {
  const projectPath = useAppStore((s) => s.projectPath)
  const removeArtifact = useDiscoveryStore((s) => s.removeArtifact)

  return (
    <div className="group flex items-start gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors">
      <div className="mt-0.5">
        {artifact.type === 'file' ? <FileIcon /> : <LinkIcon />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-surface-300 truncate">{artifact.name}</span>
          {artifact.type === 'link' && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${linkTypeBadgeColor((artifact as LinkArtifact).linkType)}`}>
              {(artifact as LinkArtifact).linkType || 'link'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {artifact.type === 'file' && (
            <span className="text-[10px] text-surface-500 font-mono truncate">
              {(artifact as FileArtifact).relativePath}
            </span>
          )}
          {artifact.type === 'link' && (artifact as LinkArtifact).description && (
            <span className="text-[10px] text-surface-500 truncate">
              {(artifact as LinkArtifact).description}
            </span>
          )}
          <span className="text-[10px] text-surface-600 flex-shrink-0">{formatDate(artifact.addedAt)}</span>
        </div>
        {artifact.tags && artifact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {artifact.tags.map((tag) => (
              <span key={tag} className="text-[9px] bg-surface-700 text-surface-400 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => projectPath && removeArtifact(projectPath, artifact.id)}
        className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
        title="Remove artifact"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

export function ArtifactList(): JSX.Element {
  const artifacts = useDiscoveryStore((s) => s.artifacts)
  const setAddFileDialogOpen = useDiscoveryStore((s) => s.setAddFileDialogOpen)
  const setAddLinkDialogOpen = useDiscoveryStore((s) => s.setAddLinkDialogOpen)

  const fileArtifacts = artifacts.filter((a) => a.type === 'file')
  const linkArtifacts = artifacts.filter((a) => a.type === 'link')

  return (
    <div className="w-[280px] flex flex-col border-r border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-surface-300">Discovery Artifacts</span>
          {artifacts.length > 0 && (
            <span className="text-[10px] bg-surface-700 text-surface-400 px-1.5 py-0.5 rounded-full">
              {artifacts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAddFileDialogOpen(true)}
            className="px-2 py-0.5 text-[10px] font-medium text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded transition-colors"
          >
            + File
          </button>
          <button
            onClick={() => setAddLinkDialogOpen(true)}
            className="px-2 py-0.5 text-[10px] font-medium text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded transition-colors"
          >
            + Link
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-1">
        {artifacts.length === 0 && (
          <div className="flex items-center justify-center py-8 text-surface-500 text-xs">
            No artifacts yet
          </div>
        )}

        {fileArtifacts.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1">
              <span className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Files</span>
            </div>
            {fileArtifacts.map((a) => (
              <ArtifactItem key={a.id} artifact={a} />
            ))}
          </div>
        )}

        {linkArtifacts.length > 0 && (
          <div>
            <div className="px-3 py-1">
              <span className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Links</span>
            </div>
            {linkArtifacts.map((a) => (
              <ArtifactItem key={a.id} artifact={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

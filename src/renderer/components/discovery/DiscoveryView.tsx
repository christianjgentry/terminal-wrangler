import { useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useDiscoveryStore } from '../../stores/discovery-store'
import { ArtifactList } from './ArtifactList'
import { AddArtifactDialog } from './AddArtifactDialog'
import { AddLinkDialog } from './AddLinkDialog'

export function DiscoveryView(): JSX.Element {
  const projectPath = useAppStore((s) => s.projectPath)
  const initialized = useDiscoveryStore((s) => s.initialized)
  const loading = useDiscoveryStore((s) => s.loading)
  const checkExists = useDiscoveryStore((s) => s.checkExists)
  const initFolder = useDiscoveryStore((s) => s.initFolder)
  const addFileDialogOpen = useDiscoveryStore((s) => s.addFileDialogOpen)
  const addLinkDialogOpen = useDiscoveryStore((s) => s.addLinkDialogOpen)

  useEffect(() => {
    if (projectPath) {
      checkExists(projectPath)
    }
  }, [projectPath, checkExists])

  if (!projectPath) {
    return (
      <div className="flex-1 flex items-center justify-center text-surface-500 text-sm">
        No project loaded
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-surface-400 text-sm">
            Discovery folder not initialized
          </div>
          <p className="text-surface-500 text-xs max-w-[300px]">
            Create a discovery folder to store call transcripts, meeting notes, and links to external resources that provide context to AI agents.
          </p>
          <button
            onClick={() => initFolder(projectPath)}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Initializing...' : 'Init Discovery Folder'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 flex overflow-hidden">
        <ArtifactList />
        <div className="flex-1 flex items-center justify-center text-surface-500 text-xs">
          Select an artifact to view details
        </div>
      </div>
      {addFileDialogOpen && <AddArtifactDialog />}
      {addLinkDialogOpen && <AddLinkDialog />}
    </>
  )
}

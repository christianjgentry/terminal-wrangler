import { useEffect } from 'react'
import { useGithubStore } from '../../stores/github-store'
import { useAppStore } from '../../stores/app-store'

export function GitHubStatusBar(): JSX.Element | null {
  const projectPath = useAppStore((s) => s.projectPath)
  const projectStatus = useGithubStore((s) => s.projectStatus)
  const setProjectStatus = useGithubStore((s) => s.setProjectStatus)
  const trackedCount = useGithubStore((s) => Object.keys(s.prInfoByAgent).length)

  useEffect(() => {
    if (!projectPath) return
    window.api.getGithubProjectStatus(projectPath).then(setProjectStatus).catch(() => {})
  }, [projectPath, setProjectStatus])

  if (!projectStatus) return null

  const auth = projectStatus.authStatus
  const remote = projectStatus.remote

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 border-b border-white/5 text-[10px] text-surface-500 shrink-0">
      {/* gh CLI availability */}
      {!projectStatus.ghAvailable ? (
        <span className="text-yellow-500">gh CLI not found</span>
      ) : (
        <>
          {/* Auth status */}
          {auth && (
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${auth.authenticated ? 'bg-emerald-400' : 'bg-red-400'}`}
              />
              <span className={auth.authenticated ? 'text-surface-400' : 'text-red-400'}>
                {auth.authenticated ? auth.username : 'Not authenticated'}
              </span>
            </div>
          )}

          {/* Remote */}
          {remote && (
            <span className="text-surface-500">{remote.fullName}</span>
          )}

          {/* Tracked PRs */}
          {trackedCount > 0 && (
            <span className="text-surface-500">
              {trackedCount} PR{trackedCount !== 1 ? 's' : ''} tracked
            </span>
          )}
        </>
      )}
    </div>
  )
}

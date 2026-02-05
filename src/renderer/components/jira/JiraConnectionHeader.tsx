import { useState, useCallback } from 'react'
import { useJiraStore } from '../../stores/jira-store'

export function JiraConnectionHeader(): JSX.Element {
  const credentials = useJiraStore((s) => s.credentials)
  const displayName = useJiraStore((s) => s.displayName)
  const selectedProjectKey = useJiraStore((s) => s.selectedProjectKey)
  const disconnect = useJiraStore((s) => s.disconnect)
  const clearProjectKey = useJiraStore((s) => s.clearProjectKey)

  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

  const hostname = credentials?.cloudUrl
    ? new URL(
        credentials.cloudUrl.startsWith('http')
          ? credentials.cloudUrl
          : `https://${credentials.cloudUrl}`
      ).hostname
    : ''

  const handleDisconnect = useCallback(async () => {
    await disconnect()
    setShowDisconnectConfirm(false)
  }, [disconnect])

  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-surface-800/50">
      <div className="flex items-center gap-3 min-w-0">
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-surface-400 truncate max-w-[140px]" title={hostname}>
            {hostname}
          </span>
        </div>

        {/* Display name */}
        {displayName && (
          <span className="text-[10px] text-surface-500 truncate max-w-[100px]" title={displayName}>
            {displayName}
          </span>
        )}

        {/* Project badge */}
        {selectedProjectKey && (
          <button
            onClick={clearProjectKey}
            className="px-1.5 py-0.5 text-[10px] font-medium text-accent bg-accent/10 rounded hover:bg-accent/20 transition-colors"
            title="Change project"
          >
            {selectedProjectKey}
          </button>
        )}
      </div>

      {/* Disconnect */}
      <div className="relative">
        {showDisconnectConfirm ? (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-surface-400 mr-1">Disconnect?</span>
            <button
              onClick={handleDisconnect}
              className="px-1.5 py-0.5 text-[10px] font-medium text-red-400 bg-red-500/10 rounded hover:bg-red-500/20 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setShowDisconnectConfirm(false)}
              className="px-1.5 py-0.5 text-[10px] font-medium text-surface-400 bg-surface-700 rounded hover:bg-surface-600 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDisconnectConfirm(true)}
            className="text-[10px] text-surface-500 hover:text-surface-300 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  )
}

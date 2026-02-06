import { useCallback, useEffect, useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useAppStore } from '../../stores/app-store'
import { AdhocTerminalView } from '../terminal/AdhocTerminalView'
import { AuthStatusBadge } from './AuthStatusBadge'

const COMMAND_ID = 'settings:gh-auth'

export function GitHubAuthCard(): JSX.Element {
  const github = useSettingsStore((s) => s.github)
  const fetchGitHubStatus = useSettingsStore((s) => s.fetchGitHubStatus)
  const projectPath = useAppStore((s) => s.projectPath)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [terminalActive, setTerminalActive] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchGitHubStatus()
    } finally {
      setRefreshing(false)
    }
  }, [fetchGitHubStatus])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText('gh auth login')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const handleRunInTerminal = useCallback(async () => {
    const cwd = projectPath || '/'
    setTerminalActive(true)
    await window.api.runDocsCommand(COMMAND_ID, 'gh auth login', cwd, cwd)
  }, [projectPath])

  const handleCancel = useCallback(async () => {
    await window.api.stopDocsCommand(COMMAND_ID)
    setTerminalActive(false)
  }, [])

  // Auto-refresh on process exit
  useEffect(() => {
    if (!terminalActive) return
    const unsub = window.api.onDocsCommandExit((data) => {
      if (data.commandId === COMMAND_ID) {
        setTimeout(() => {
          fetchGitHubStatus()
          setTerminalActive(false)
        }, 1500)
      }
    })
    return unsub
  }, [terminalActive, fetchGitHubStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.api.stopDocsCommand(COMMAND_ID)
    }
  }, [])

  return (
    <div className="bg-surface-800 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-200">GitHub</span>
          <AuthStatusBadge status={github.status} />
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-[10px] text-surface-500 hover:text-surface-300 transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {github.status === 'connected' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-surface-500 w-16">User</span>
            <span className="text-xs text-surface-200 font-mono">{github.username}</span>
          </div>
          {github.scopes.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-surface-500 w-16 pt-0.5">Scopes</span>
              <div className="flex flex-wrap gap-1">
                {github.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="text-[9px] font-mono text-surface-400 bg-surface-700 px-1.5 py-0.5 rounded"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {github.status === 'disconnected' && github.ghAvailable && (
        <div className="space-y-2">
          <p className="text-[11px] text-surface-400">
            The GitHub CLI is installed but not authenticated. Run this command to log in:
          </p>
          {!terminalActive && (
            <>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-surface-900 border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-surface-300">
                  gh auth login
                </code>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 text-[10px] font-medium text-surface-300 bg-surface-700 hover:bg-surface-600 rounded transition-colors"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button
                onClick={handleRunInTerminal}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors"
              >
                Run gh auth login
              </button>
            </>
          )}
          {terminalActive && (
            <>
              <div className="h-64 rounded-lg overflow-hidden border border-white/10">
                <AdhocTerminalView commandId={COMMAND_ID} />
              </div>
              <button
                onClick={handleCancel}
                className="text-[10px] text-surface-500 hover:text-red-400 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {github.status === 'disconnected' && !github.ghAvailable && (
        <div className="space-y-2">
          <p className="text-[11px] text-surface-400">
            The GitHub CLI (<code className="text-surface-300">gh</code>) is not installed.
          </p>
          <p className="text-[11px] text-surface-500">
            Install it via <code className="text-surface-400">brew install gh</code> then run{' '}
            <code className="text-surface-400">gh auth login</code>.
          </p>
        </div>
      )}

      {github.status === 'error' && github.error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {github.error}
        </div>
      )}
    </div>
  )
}

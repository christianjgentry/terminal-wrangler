import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useAppStore } from '../../stores/app-store'
import { AdhocTerminalView } from '../terminal/AdhocTerminalView'
import { AuthStatusBadge } from './AuthStatusBadge'

const COMMAND_ID = 'settings:claude-auth'
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g

export function ClaudeAuthCard(): JSX.Element {
  const claude = useSettingsStore((s) => s.claude)
  const fetchClaudeStatus = useSettingsStore((s) => s.fetchClaudeStatus)
  const projectPath = useAppStore((s) => s.projectPath)

  const [refreshing, setRefreshing] = useState(false)
  const [terminalActive, setTerminalActive] = useState(false)
  const closingRef = useRef(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchClaudeStatus()
    } finally {
      setRefreshing(false)
    }
  }, [fetchClaudeStatus])

  const handleRunInTerminal = useCallback(async () => {
    const cwd = projectPath || '/'
    closingRef.current = false
    setTerminalActive(true)
    await window.api.runDocsCommand(COMMAND_ID, 'claude', cwd, cwd)
  }, [projectPath])

  const handleCancel = useCallback(async () => {
    await window.api.stopDocsCommand(COMMAND_ID)
    setTerminalActive(false)
  }, [])

  // Detect "Login successful" in output and auto-close
  useEffect(() => {
    if (!terminalActive) return
    const unsub = window.api.onDocsCommandOutput((data) => {
      if (data.commandId !== COMMAND_ID || closingRef.current) return
      const text = data.data.replace(ANSI_RE, '')
      if (/login successful/i.test(text)) {
        closingRef.current = true
        setTimeout(async () => {
          await window.api.stopDocsCommand(COMMAND_ID)
          await fetchClaudeStatus()
          setTerminalActive(false)
        }, 1500)
      }
    })
    return unsub
  }, [terminalActive, fetchClaudeStatus])

  // Also handle normal process exit
  useEffect(() => {
    if (!terminalActive) return
    const unsub = window.api.onDocsCommandExit((data) => {
      if (data.commandId === COMMAND_ID) {
        setTimeout(() => {
          fetchClaudeStatus()
          setTerminalActive(false)
        }, 1500)
      }
    })
    return unsub
  }, [terminalActive, fetchClaudeStatus])

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
          <span className="text-sm font-medium text-surface-200">Claude / Anthropic</span>
          <AuthStatusBadge status={claude.status} />
        </div>
        {claude.status === 'connected' && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-[10px] text-surface-500 hover:text-surface-300 transition-colors disabled:opacity-50"
          >
            {refreshing ? 'Checking...' : 'Refresh'}
          </button>
        )}
      </div>

      {claude.status === 'connected' && claude.authMode === 'oauth' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-surface-500 w-20">Auth mode</span>
            <span className="text-xs text-surface-200">OAuth</span>
          </div>
          {claude.subscriptionType && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-surface-500 w-20">Plan</span>
              <span className="text-xs text-surface-200">{claude.subscriptionType}</span>
            </div>
          )}
          {claude.rateLimitTier && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-surface-500 w-20">Tier</span>
              <span className="text-xs text-surface-200">{claude.rateLimitTier}</span>
            </div>
          )}
        </div>
      )}

      {(claude.status === 'disconnected' || claude.status === 'error') && (
        <div className="space-y-3">
          {claude.error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {claude.error}
            </div>
          )}

          {!terminalActive && (
            <>
              <p className="text-[11px] text-surface-400">
                Log in with the <code className="text-surface-300">claude</code> CLI to connect
                your account.
              </p>
              <button
                onClick={handleRunInTerminal}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors"
              >
                Run claude login
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
    </div>
  )
}

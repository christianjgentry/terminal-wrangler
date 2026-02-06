import { useCallback, useEffect, useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useSessionUsageStore } from '../../stores/session-usage-store'
import { useAppStore } from '../../stores/app-store'
import { AdhocTerminalView } from '../terminal/AdhocTerminalView'
import { AuthStatusBadge } from './AuthStatusBadge'

const COMMAND_ID = 'settings:claude-auth'

export function ClaudeAuthCard(): JSX.Element {
  const claude = useSettingsStore((s) => s.claude)
  const fetchClaudeStatus = useSettingsStore((s) => s.fetchClaudeStatus)
  const setApiKey = useSessionUsageStore((s) => s.setApiKey)
  const projectPath = useAppStore((s) => s.projectPath)

  const [refreshing, setRefreshing] = useState(false)
  const [keyValue, setKeyValue] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [terminalActive, setTerminalActive] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchClaudeStatus()
    } finally {
      setRefreshing(false)
    }
  }, [fetchClaudeStatus])

  const handleSaveKey = useCallback(async () => {
    const trimmed = keyValue.trim()
    if (!trimmed) return
    setSavingKey(true)
    try {
      await setApiKey(trimmed)
      setKeyValue('')
      await fetchClaudeStatus()
    } finally {
      setSavingKey(false)
    }
  }, [keyValue, setApiKey, fetchClaudeStatus])

  const handleClearKey = useCallback(async () => {
    setSavingKey(true)
    try {
      await setApiKey(null)
      await fetchClaudeStatus()
    } finally {
      setSavingKey(false)
    }
  }, [setApiKey, fetchClaudeStatus])

  const handleRunInTerminal = useCallback(async () => {
    const cwd = projectPath || '/'
    setTerminalActive(true)
    await window.api.runDocsCommand(COMMAND_ID, 'claude', cwd, cwd)
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

      {claude.status === 'connected' && claude.authMode === 'api-key' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-surface-500 w-20">Auth mode</span>
            <span className="text-xs text-surface-200">API Key</span>
          </div>
          <button
            onClick={handleClearKey}
            disabled={savingKey}
            className="text-[10px] text-surface-500 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            Clear API key
          </button>
        </div>
      )}

      {(claude.status === 'disconnected' || claude.status === 'error') && (
        <div className="space-y-3">
          {claude.error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {claude.error}
            </div>
          )}

          <p className="text-[11px] text-surface-400">
            Log in with the <code className="text-surface-300">claude</code> CLI for OAuth, or
            enter an API key below.
          </p>

          {!terminalActive && (
            <>
              <button
                onClick={handleRunInTerminal}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors"
              >
                Run claude login
              </button>

              <div>
                <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
                  Anthropic API Key
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveKey()
                    }}
                    placeholder="sk-ant-..."
                    className="flex-1 bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-accent/50"
                  />
                  <button
                    onClick={handleSaveKey}
                    disabled={!keyValue.trim() || savingKey}
                    className="px-3 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingKey ? '...' : 'Save'}
                  </button>
                </div>
              </div>
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

          {!terminalActive && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[10px] text-surface-500 hover:text-surface-300 transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Checking...' : 'Retry OAuth connection'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

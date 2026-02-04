import { useState, useCallback } from 'react'
import { useJiraStore } from '../../stores/jira-store'

export function JiraConnectionSetup(): JSX.Element {
  const credentials = useJiraStore((s) => s.credentials)
  const connectionStatus = useJiraStore((s) => s.connectionStatus)
  const connectionError = useJiraStore((s) => s.connectionError)
  const saveCredentials = useJiraStore((s) => s.saveCredentials)
  const testConnection = useJiraStore((s) => s.testConnection)

  const [cloudUrl, setCloudUrl] = useState(credentials?.cloudUrl || '')
  const [email, setEmail] = useState(credentials?.email || '')
  const [apiToken, setApiToken] = useState(credentials?.apiToken || '')
  const [testing, setTesting] = useState(false)

  const handleTest = useCallback(async () => {
    if (!cloudUrl.trim() || !email.trim() || !apiToken.trim()) return
    setTesting(true)
    const creds = { cloudUrl: cloudUrl.trim(), email: email.trim(), apiToken: apiToken.trim() }
    await testConnection(creds)
    setTesting(false)
  }, [cloudUrl, email, apiToken, testConnection])

  const handleSave = useCallback(async () => {
    if (!cloudUrl.trim() || !email.trim() || !apiToken.trim()) return
    const creds = { cloudUrl: cloudUrl.trim(), email: email.trim(), apiToken: apiToken.trim() }
    await saveCredentials(creds)
    if (connectionStatus !== 'connected') {
      setTesting(true)
      await testConnection(creds)
      setTesting(false)
    }
  }, [cloudUrl, email, apiToken, saveCredentials, testConnection, connectionStatus])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave()
      }
    },
    [handleSave]
  )

  return (
    <div className="flex-1 flex items-center justify-center">
      <div
        className="bg-surface-800 border border-white/10 rounded-xl w-[400px] p-6 space-y-4"
        onKeyDown={handleKeyDown}
      >
        <div>
          <h2 className="text-sm font-semibold text-surface-200">Connect to Jira</h2>
          <p className="text-[10px] text-surface-500 mt-1">
            Enter your Jira Cloud credentials to browse epics and stories.
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
            Cloud URL
          </label>
          <input
            type="text"
            value={cloudUrl}
            onChange={(e) => setCloudUrl(e.target.value)}
            placeholder="https://your-org.atlassian.net"
            className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-accent/50"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-accent/50"
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-1.5">
            API Token
          </label>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="Jira API token"
            className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-accent/50"
          />
          <p className="text-[9px] text-surface-600 mt-1">
            Generate at id.atlassian.com/manage-profile/security/api-tokens
          </p>
        </div>

        {connectionStatus === 'error' && connectionError && (
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {connectionError}
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
            Connected successfully
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleTest}
            disabled={testing || !cloudUrl.trim() || !email.trim() || !apiToken.trim()}
            className="px-3 py-1.5 text-xs font-medium text-surface-300 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleSave}
            disabled={!cloudUrl.trim() || !email.trim() || !apiToken.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

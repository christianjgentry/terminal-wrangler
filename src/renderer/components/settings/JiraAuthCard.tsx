import { useCallback, useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { useJiraStore } from '../../stores/jira-store'
import { AuthStatusBadge } from './AuthStatusBadge'

export function JiraAuthCard(): JSX.Element {
  const jira = useSettingsStore((s) => s.jira)
  const fetchJiraStatus = useSettingsStore((s) => s.fetchJiraStatus)

  const jiraSaveCredentials = useJiraStore((s) => s.saveCredentials)
  const jiraTestConnection = useJiraStore((s) => s.testConnection)
  const jiraDisconnect = useJiraStore((s) => s.disconnect)

  const [editing, setEditing] = useState(false)
  const [cloudUrl, setCloudUrl] = useState('')
  const [email, setEmail] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  const showForm = jira.status === 'disconnected' || editing

  const handleEdit = useCallback(() => {
    setEditing(true)
    setCloudUrl(jira.cloudUrl || '')
    setEmail('')
    setApiToken('')
    setTestError(null)
  }, [jira.cloudUrl])

  const handleCancel = useCallback(() => {
    setEditing(false)
    setTestError(null)
  }, [])

  const handleTest = useCallback(async () => {
    if (!cloudUrl.trim() || !email.trim() || !apiToken.trim()) return
    setTesting(true)
    setTestError(null)
    const creds = { cloudUrl: cloudUrl.trim(), email: email.trim(), apiToken: apiToken.trim() }
    const result = await jiraTestConnection(creds)
    setTesting(false)
    if (!result.connected) {
      setTestError(result.error || 'Connection failed')
    }
  }, [cloudUrl, email, apiToken, jiraTestConnection])

  const handleSave = useCallback(async () => {
    if (!cloudUrl.trim() || !email.trim() || !apiToken.trim()) return
    setTesting(true)
    setTestError(null)
    const creds = { cloudUrl: cloudUrl.trim(), email: email.trim(), apiToken: apiToken.trim() }
    const result = await jiraTestConnection(creds)
    if (result.connected) {
      await jiraSaveCredentials(creds)
      setEditing(false)
      await fetchJiraStatus()
    } else {
      setTestError(result.error || 'Connection failed')
    }
    setTesting(false)
  }, [cloudUrl, email, apiToken, jiraTestConnection, jiraSaveCredentials, fetchJiraStatus])

  const handleDisconnect = useCallback(async () => {
    await jiraDisconnect()
    setEditing(false)
    await fetchJiraStatus()
  }, [jiraDisconnect, fetchJiraStatus])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave()
      }
    },
    [handleSave]
  )

  return (
    <div className="bg-surface-800 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-200">Jira</span>
          <AuthStatusBadge status={jira.status} />
        </div>
        {jira.status === 'connected' && !editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="text-[10px] text-surface-500 hover:text-surface-300 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDisconnect}
              className="text-[10px] text-surface-500 hover:text-red-400 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {jira.status === 'connected' && !editing && (
        <div className="space-y-1.5">
          {jira.cloudUrl && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-surface-500 w-16">Instance</span>
              <span className="text-xs text-surface-200 font-mono truncate">{jira.cloudUrl}</span>
            </div>
          )}
          {jira.displayName && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-surface-500 w-16">User</span>
              <span className="text-xs text-surface-200">{jira.displayName}</span>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="space-y-3" onKeyDown={handleKeyDown}>
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

          {testError && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {testError}
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
              disabled={testing || !cloudUrl.trim() || !email.trim() || !apiToken.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            {editing && (
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-surface-300 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {jira.status === 'error' && !editing && jira.error && (
        <div className="space-y-2">
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {jira.error}
          </div>
          <button
            onClick={handleEdit}
            className="text-[10px] text-surface-500 hover:text-surface-300 transition-colors"
          >
            Edit credentials
          </button>
        </div>
      )}
    </div>
  )
}

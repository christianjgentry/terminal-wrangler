import { GitHubAuthCard } from './GitHubAuthCard'
import { JiraAuthCard } from './JiraAuthCard'
import { ClaudeAuthCard } from './ClaudeAuthCard'

export function AuthenticationSection(): JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-surface-200">Authentication</h2>
        <p className="text-[11px] text-surface-500 mt-1">
          Manage credentials for external services used by Terminal Wrangler.
        </p>
      </div>

      <GitHubAuthCard />
      <JiraAuthCard />
      <ClaudeAuthCard />
    </div>
  )
}

import { appStore } from '../store'
import type { JiraCredentials } from '@shared/jira-types'

export function getJiraCredentials(): JiraCredentials | null {
  return appStore.get('jiraCredentials', null) as JiraCredentials | null
}

export function setJiraCredentials(creds: JiraCredentials): void {
  appStore.set('jiraCredentials', creds)
}

export function getJiraProjectKey(): string | null {
  return appStore.get('jiraProjectKey', null) as string | null
}

export function setJiraProjectKey(key: string): void {
  appStore.set('jiraProjectKey', key)
}

export function clearJiraCredentials(): void {
  appStore.delete('jiraCredentials')
}

export function clearJiraProjectKey(): void {
  appStore.delete('jiraProjectKey')
}

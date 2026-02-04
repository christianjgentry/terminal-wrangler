export interface JiraCredentials {
  cloudUrl: string
  email: string
  apiToken: string
}

export interface JiraConnectionResult {
  connected: boolean
  displayName?: string
  error?: string
}

export interface JiraProject {
  key: string
  name: string
}

export interface JiraEpic {
  key: string
  summary: string
  status: string
  description: string
  storyCount?: number
}

export interface JiraStory {
  key: string
  summary: string
  status: string
  description: string
  priority: string
  assignee: string
  labels: string[]
  epicKey: string
  issueType: string
}

export interface JiraTransition {
  id: string
  name: string
}

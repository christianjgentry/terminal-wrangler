export interface StandardsFile {
  name: string // e.g., "sprint-planning-rules.md"
  relativePath: string // e.g., "references/sprint-planning-rules.md"
  category: string // e.g., "references" | "examples" | "root"
}

export interface PlanToJiraRequest {
  featureDescription: string
  projectKey?: string
  includeConfluence: boolean
  includeDiscovery?: boolean
  projectPath?: string
}

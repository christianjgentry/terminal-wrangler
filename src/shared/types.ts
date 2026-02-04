export type ServiceStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error'
  | 'crashed'

export interface HealthCheckConfig {
  command: string
  interval: number
  retries: number
  startDelay?: number
}

export interface ServiceConfig {
  id: string
  name: string
  command: string
  workingDirectory: string
  dependsOn: string[]
  docs?: string
  healthCheck?: HealthCheckConfig
  env?: Record<string, string>
  tags?: string[]
}

export interface ProjectConfig {
  project: {
    name: string
    description?: string
  }
  services: Record<string, ServiceConfig>
}

export interface ServiceState {
  id: string
  config: ServiceConfig
  status: ServiceStatus
  pid?: number
  exitCode?: number | null
  healthCheckPassing: boolean
  lastHealthCheck?: number
}

export interface TerminalData {
  serviceId: string
  data: string
}

export interface AppSettings {
  recentProjects: RecentProject[]
  windowBounds?: { x: number; y: number; width: number; height: number }
  terminalPanelHeight?: number
  sidebarWidth?: number
  docsPanelWidth?: number
  anthropicApiKey?: string
}

export interface DetectedScript {
  id: string
  name: string
  command: string
  source: string
  environment: string
  workingDirectory: string
  isLongRunning: boolean
}

export interface ProjectDocsData {
  readme: string | null
  scripts: DetectedScript[]
  environments: string[]
  isNpmProject: boolean
}

export interface RecentProject {
  path: string
  name: string
  lastOpened: number
}

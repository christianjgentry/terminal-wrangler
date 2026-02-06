export const IPC = {
  // Config
  CONFIG_LOAD: 'config:load',
  CONFIG_CHANGED: 'config:changed',
  CONFIG_ERROR: 'config:error',
  CONFIG_GENERATE: 'config:generate',
  CONFIG_SAVE: 'config:save',

  // Dialog
  DIALOG_OPEN_FILES: 'dialog:open-files',

  // Project
  PROJECT_OPEN: 'project:open',
  PROJECT_OPEN_RECENT: 'project:open-recent',

  // Process management
  PROCESS_START: 'process:start',
  PROCESS_STOP: 'process:stop',
  PROCESS_RESTART: 'process:restart',
  PROCESS_START_ALL: 'process:start-all',
  PROCESS_STOP_ALL: 'process:stop-all',

  // Status events (main -> renderer)
  SERVICE_STATUS_CHANGED: 'service:status-changed',
  SERVICE_EXIT: 'service:exit',

  // Terminal data
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_GET_BUFFER: 'terminal:get-buffer',

  // Health checks
  HEALTH_CHECK_RESULT: 'health:result',

  // App
  APP_GET_SETTINGS: 'app:get-settings',
  APP_SAVE_SETTINGS: 'app:save-settings',
  APP_GET_RECENT_PROJECTS: 'app:get-recent-projects',

  // Docs panel
  DOCS_GET_PROJECT_DOCS: 'docs:get-project-docs',
  DOCS_RUN_COMMAND: 'docs:run-command',
  DOCS_COMMAND_STOP: 'docs:command-stop',
  DOCS_COMMAND_OUTPUT: 'docs:command-output',
  DOCS_COMMAND_EXIT: 'docs:command-exit',
  DOCS_COMMAND_INPUT: 'docs:command-input',
  DOCS_COMMAND_RESIZE: 'docs:command-resize',
  DOCS_COMMAND_GET_BUFFER: 'docs:command-get-buffer',

  // Agent management
  AGENT_CREATE: 'agent:create',
  AGENT_STOP: 'agent:stop',
  AGENT_STOP_ALL: 'agent:stop-all',
  AGENT_REMOVE: 'agent:remove',
  AGENT_GET_ALL: 'agent:get-all',
  AGENT_GET_STATE: 'agent:get-state',
  AGENT_MARK_DONE: 'agent:mark-done',

  // Agent events (main -> renderer)
  AGENT_STATUS_CHANGED: 'agent:status-changed',
  AGENT_EXIT: 'agent:exit',
  AGENT_SUBAGENT_DETECTED: 'agent:subagent-detected',
  AGENT_PR_DETECTED: 'agent:pr-detected',
  AGENT_CONTEXT_USAGE: 'agent:context-usage',
  AGENT_TASKS_CHANGED: 'agent:tasks-changed',
  AGENT_PLAN_DETECTED: 'agent:plan-detected',
  AGENT_INPUT_NEEDED: 'agent:input-needed',

  // Agent terminal
  AGENT_TERMINAL_DATA: 'agent:terminal-data',
  AGENT_TERMINAL_INPUT: 'agent:terminal-input',
  AGENT_TERMINAL_RESIZE: 'agent:terminal-resize',
  AGENT_TERMINAL_GET_BUFFER: 'agent:terminal-get-buffer',
  AGENT_GET_PLAN_CONTENT: 'agent:get-plan-content',
  AGENT_SAVE_PLAN: 'agent:save-plan',

  // GitHub integration
  GITHUB_GET_AUTH_STATUS: 'github:get-auth-status',
  GITHUB_GET_REMOTE: 'github:get-remote',
  GITHUB_GET_PR_INFO: 'github:get-pr-info',
  GITHUB_LIST_PRS: 'github:list-prs',
  GITHUB_GET_PROJECT_STATUS: 'github:get-project-status',
  GITHUB_MERGE_PR: 'github:merge-pr',
  GITHUB_GET_PR_DIFF: 'github:get-pr-diff',
  GITHUB_PR_INFO_UPDATED: 'github:pr-info-updated',

  // Session usage
  SESSION_USAGE_GET: 'session-usage:get',
  SESSION_USAGE_REFRESH: 'session-usage:refresh',
  SESSION_USAGE_CHANGED: 'session-usage:changed',
  // Jira integration
  JIRA_GET_CREDENTIALS: 'jira:get-credentials',
  JIRA_SET_CREDENTIALS: 'jira:set-credentials',
  JIRA_TEST_CONNECTION: 'jira:test-connection',
  JIRA_GET_PROJECT_KEY: 'jira:get-project-key',
  JIRA_SET_PROJECT_KEY: 'jira:set-project-key',
  JIRA_GET_EPICS: 'jira:get-epics',
  JIRA_GET_STORIES_BY_EPIC: 'jira:get-stories-by-epic',
  JIRA_GET_ISSUE: 'jira:get-issue',
  JIRA_REFRESH_EPICS: 'jira:refresh-epics',
  JIRA_REFRESH_STORIES: 'jira:refresh-stories',
  JIRA_ADD_COMMENT: 'jira:add-comment',
  JIRA_TRANSITION_ISSUE: 'jira:transition-issue',
  JIRA_GET_TRANSITIONS: 'jira:get-transitions',
  JIRA_CLEAR_CREDENTIALS: 'jira:clear-credentials',

  // Standards / Planner
  STANDARDS_GET_DIR: 'standards:get-dir',
  STANDARDS_SET_DIR: 'standards:set-dir',
  STANDARDS_LIST_FILES: 'standards:list-files',
  STANDARDS_READ_FILE: 'standards:read-file',
  STANDARDS_WRITE_FILE: 'standards:write-file',
  PLANNER_SPAWN_AGENT: 'planner:spawn-agent'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

export interface IpcPayloadMap {
  // Service events (main -> renderer)
  [IPC.SERVICE_STATUS_CHANGED]: { serviceId: string; status: import('./types').ServiceStatus; pid?: number }
  [IPC.SERVICE_EXIT]: { serviceId: string; exitCode: number | null }
  [IPC.TERMINAL_DATA]: { serviceId: string; data: string }
  [IPC.HEALTH_CHECK_RESULT]: { serviceId: string; healthy: boolean; output: string }

  // Agent events (main -> renderer)
  [IPC.AGENT_STATUS_CHANGED]: { agentId: string; status: import('./agent-types').AgentStatus }
  [IPC.AGENT_EXIT]: { agentId: string; exitCode: number | null }
  [IPC.AGENT_TERMINAL_DATA]: { agentId: string; data: string }
  [IPC.AGENT_SUBAGENT_DETECTED]: { agentId: string; subagent: import('./agent-types').AgentInfo }
  [IPC.AGENT_PR_DETECTED]: { agentId: string; prUrl: string }
  [IPC.AGENT_CONTEXT_USAGE]: { agentId: string; used: number; max: number }
  [IPC.AGENT_TASKS_CHANGED]: { agentId: string; tasks: import('./agent-types').AgentTask[] }
  [IPC.AGENT_PLAN_DETECTED]: { agentId: string; planFilePath: string }
  [IPC.AGENT_INPUT_NEEDED]: { agentId: string; agentName: string; prompt: string }

  // GitHub events (main -> renderer)
  [IPC.GITHUB_PR_INFO_UPDATED]: { agentId: string; prInfo: import('./github-types').PrInfo }

  // Session usage events (main -> renderer)
  [IPC.SESSION_USAGE_CHANGED]: import('./session-usage-types').SessionUsageData | null

  // Docs events (main -> renderer)
  [IPC.DOCS_COMMAND_OUTPUT]: { commandId: string; data: string }
  [IPC.DOCS_COMMAND_EXIT]: { commandId: string; exitCode: number }

  // Config events (main -> renderer)
  [IPC.CONFIG_CHANGED]: import('./types').ProjectConfig
  [IPC.CONFIG_ERROR]: string
}

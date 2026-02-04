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

  // Agent management
  AGENT_CREATE: 'agent:create',
  AGENT_STOP: 'agent:stop',
  AGENT_STOP_ALL: 'agent:stop-all',
  AGENT_REMOVE: 'agent:remove',
  AGENT_GET_ALL: 'agent:get-all',
  AGENT_GET_STATE: 'agent:get-state',

  // Agent events (main -> renderer)
  AGENT_STATUS_CHANGED: 'agent:status-changed',
  AGENT_EXIT: 'agent:exit',
  AGENT_SUBAGENT_DETECTED: 'agent:subagent-detected',
  AGENT_PR_DETECTED: 'agent:pr-detected',
  AGENT_CONTEXT_USAGE: 'agent:context-usage',
  AGENT_TASKS_CHANGED: 'agent:tasks-changed',
  AGENT_PLAN_DETECTED: 'agent:plan-detected',

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
  SESSION_USAGE_SET_API_KEY: 'session-usage:set-api-key'
} as const

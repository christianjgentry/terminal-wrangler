export const IPC = {
  // Config
  CONFIG_LOAD: 'config:load',
  CONFIG_CHANGED: 'config:changed',
  CONFIG_ERROR: 'config:error',
  CONFIG_GENERATE: 'config:generate',
  CONFIG_SAVE: 'config:save',

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
  DOCS_COMMAND_RESIZE: 'docs:command-resize'
} as const

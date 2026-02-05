# Terminal Wrangler

A desktop application for visualizing and managing your project's terminal services through an interactive dependency graph, with built-in AI coding agent orchestration, GitHub integration, and Jira Cloud support.

Built with Electron, React, and TypeScript.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
  - [Config File Reference](#config-file-reference)
  - [Auto-Generation](#auto-generation)
- [Views](#views)
  - [Services View](#services-view)
  - [Agents View](#agents-view)
  - [Jira View](#jira-view)
- [AI Agent Orchestration](#ai-agent-orchestration)
- [GitHub Integration](#github-integration)
- [Jira Integration](#jira-integration)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tech Stack](#tech-stack)
- [Development](#development)
- [Building](#building)
- [License](#license)

---

## Overview

Terminal Wrangler replaces the chaos of juggling multiple terminal tabs for your dev stack with a single visual interface. Define your services in a YAML config file, and Terminal Wrangler renders them as an interactive dependency graph. Start, stop, restart, and monitor services — all from one place, with full terminal access.

Beyond service management, Terminal Wrangler includes a Kanban-style AI agent board that lets you spin up Claude Code agents, track their progress from planning through PR creation, review diffs, and merge — without leaving the app.

## Features

- **Interactive Dependency Graph** — Visualize services and their relationships as a node graph with real-time status indicators
- **Embedded Terminals** — Full xterm.js terminals for every service, with resizable split panels
- **Smart Config Generation** — Auto-detects services from `docker-compose.yml`, `package.json` scripts, `Makefile`, `Procfile`, Python (`Django`/`FastAPI`/`Flask`), Go, and Rust projects
- **Health Checks** — Configurable health check commands with retry logic and status indicators on each node
- **AI Agent Board** — Kanban board for orchestrating Claude Code agents with task tracking, plan viewing, and context usage monitoring
- **GitHub Integration** — View PR status, review diffs, and squash-merge pull requests directly from agent cards
- **Jira Cloud Integration** — Browse epics and stories, and spawn AI agents directly from Jira tickets
- **Session Usage Tracking** — Monitor Claude API rate limits (5-hour and 7-day windows) with live utilization indicators
- **Docs Panel** — Auto-discovers your project's README, npm scripts, and environment files for quick reference
- **Monorepo Support** — Detects npm/yarn/pnpm workspaces, Lerna projects, and scans each package for services
- **Recent Projects** — Quick-open previously loaded projects from the welcome screen
- **Keyboard-First Workflow** — Navigate views, toggle panels, and manage services without reaching for the mouse

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [GitHub CLI](https://cli.github.com/) (`gh`) — required for GitHub integration features
- A C++ build toolchain for compiling `node-pty`:
  - **Windows**: Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload
  - **macOS**: `xcode-select --install`
  - **Linux**: `sudo apt install build-essential` (or equivalent)

### Clone and Install

```bash
git clone https://github.com/your-username/terminal-wrangler.git
cd terminal-wrangler
npm install
```

If `node-pty` fails to compile, run the rebuild script:

```bash
npm run rebuild
```

## Getting Started

### 1. Start the app in development mode

```bash
npm run dev
```

This launches both the Vite dev server (for the React renderer) and the Electron main process with hot reload.

### 2. Open a project

Click **Open Project** on the welcome screen and select a folder that contains a `.terminal-wrangler.yml` config file.

If the folder doesn't have one yet, Terminal Wrangler will offer to **auto-generate** a config by scanning the project for recognized services.

### 3. Manage services

Once loaded, your services appear as nodes in the dependency graph. Click a node to view its details and terminal. Use the header controls to start/stop all services at once, or manage them individually.

## Configuration

Terminal Wrangler is configured via a `.terminal-wrangler.yml` file placed at the root of your project.

### Config File Reference

```yaml
project:
  name: "My Project"
  description: "Optional description of this project"

services:
  database:
    name: "PostgreSQL"
    command: "docker compose up postgres"
    workingDirectory: "."
    dependsOn: []
    docs: |
      ## PostgreSQL
      Runs on port **5432**. Uses Docker.
    healthCheck:
      command: "pg_isready"
      interval: 5000
      retries: 3
      startDelay: 2000
    env:
      POSTGRES_PASSWORD: "dev"
    tags: [database, docker]

  api:
    name: "API Server"
    command: "npm run dev"
    workingDirectory: "./packages/api"
    dependsOn: [database]
    docs: |
      ## API Server
      Express.js API running on port **3001**.
    tags: [backend, node]

  frontend:
    name: "Frontend"
    command: "npm run dev"
    workingDirectory: "./packages/web"
    dependsOn: [api]
    tags: [frontend, react]
```

#### Project

| Field         | Type   | Required | Description                        |
| ------------- | ------ | -------- | ---------------------------------- |
| `name`        | string | Yes      | Display name for the project       |
| `description` | string | No       | Short description shown in the UI  |

#### Services

Each key under `services` becomes the service ID. Fields:

| Field              | Type       | Required | Description                                                        |
| ------------------ | ---------- | -------- | ------------------------------------------------------------------ |
| `name`             | string     | No       | Display name (defaults to the service ID)                          |
| `command`          | string     | Yes      | Shell command to start the service                                 |
| `workingDirectory` | string     | No       | Working directory relative to the project root (default: `.`)      |
| `dependsOn`        | string[]   | No       | List of service IDs this service depends on (shown as graph edges) |
| `docs`             | string     | No       | Markdown documentation displayed in the service detail panel       |
| `healthCheck`      | object     | No       | Health check configuration (see below)                             |
| `env`              | object     | No       | Environment variables passed to the service process                |
| `tags`             | string[]   | No       | Tags for categorization and dependency inference                   |

#### Health Check

| Field        | Type   | Required | Description                                      |
| ------------ | ------ | -------- | ------------------------------------------------ |
| `command`    | string | Yes      | Command to run for the health check              |
| `interval`   | number | Yes      | Milliseconds between health checks               |
| `retries`    | number | Yes      | Number of failures before marking unhealthy      |
| `startDelay` | number | No       | Milliseconds to wait before the first check      |

### Auto-Generation

When you open a project folder without a `.terminal-wrangler.yml`, the app offers to generate one by scanning for:

| Source                | What it detects                                                    |
| --------------------- | ------------------------------------------------------------------ |
| `docker-compose.yml`  | All compose services with ports, environment, health checks, and `depends_on` |
| `package.json`        | Long-running npm scripts (`dev`, `start`, `serve`, `watch`, `storybook`, etc.) |
| Monorepo workspaces   | npm/yarn/pnpm workspaces and Lerna packages                       |
| `Makefile`            | Long-running targets (`dev`, `serve`, `run`, `start`, `watch`, `up`) |
| `Procfile`            | All entries                                                        |
| `manage.py`           | Django dev server                                                  |
| `pyproject.toml`      | FastAPI, Flask, Celery workers                                     |
| `requirements.txt`    | FastAPI, Flask, Celery workers                                     |
| `go.mod`              | Go binaries (with `cmd/*` detection)                               |
| `Cargo.toml`          | Rust binaries (with `[[bin]]` detection)                           |

The generator also infers cross-service dependencies based on tags (e.g., backends automatically depend on detected databases).

You can review and edit the generated YAML before saving.

## Views

Terminal Wrangler has three main views, switchable from the project header or via keyboard shortcuts.

### Services View

The default view. Shows:

- **Docs Panel** (left) — Project README, detected npm scripts, and environment info
- **Dependency Graph** (center) — Interactive node graph rendered with React Flow. Each node shows the service name, status, command, and tags. Edges represent `dependsOn` relationships. Click a node to open its detail panel.
- **Service Detail** (right) — Displays the selected service's docs, status, and controls (start/stop/restart)
- **Terminal Panel** (bottom) — Resizable split panel with tabbed terminals for each running service

### Agents View

A Kanban board for managing AI coding agents. Columns track agent lifecycle:

- **Planning** — Agent is analyzing the task and creating a plan
- **Building** — Agent is actively writing code
- **PR Ready** — Agent has created a pull request
- **Done** — Task is complete

Each agent card shows task progress, context usage, branch name, and PR status. Click a card to open its terminal and see real-time output.

### Jira View

Browse your Jira Cloud project's epics and stories. Select a story to view its details, and spawn an AI agent directly from a Jira ticket — the agent's task is pre-populated from the story description.

## AI Agent Orchestration

Terminal Wrangler can spawn and manage [Claude Code](https://docs.anthropic.com/en/docs/claude-code) agents:

1. **Create an agent** — Click the "New Agent" button on the Agents board. Provide a name, task description, and optional settings:
   - **Plan mode** — Agent creates a plan before coding
   - **Create branch** — Automatically create a git branch for the work
   - **File context** — Attach specific files for the agent to reference
2. **Monitor progress** — Watch the agent work in its embedded terminal. The status detector automatically tracks transitions between Planning, Building, PR Ready, and Done.
3. **Task tracking** — Agent cards display a checklist of detected tasks parsed from Claude Code's output.
4. **Context usage** — A progress bar shows how much of the agent's context window has been consumed.
5. **Plan review** — When an agent produces a plan, view it inline or save it to disk.
6. **PR workflow** — When the agent creates a PR, view the diff, check CI status, review decisions, and squash-merge — all from the agent card.
7. **Stop and re-run** — Stop agents gracefully (Ctrl+C with escalation to SIGTERM/SIGKILL) and re-run if needed.
8. **Subagent detection** — Terminal Wrangler detects when Claude Code spawns subagents and tracks them on the parent card.

### Requirements for Agents

- Claude Code CLI must be installed and authenticated
- An Anthropic API key (set in the app settings) for session usage tracking
- GitHub CLI (`gh`) for PR features

## GitHub Integration

When a project has a git remote, Terminal Wrangler integrates with GitHub via the `gh` CLI:

- **Auth status** — Shows the authenticated GitHub user in the agents view
- **PR detection** — Automatically detects when agents create pull requests
- **PR info** — Displays PR title, status, check results, review decision, and mergeability
- **Diff viewer** — View the full PR diff in a modal
- **Squash and merge** — Merge PRs directly from the agent card

## Jira Integration

Connect to your Jira Cloud instance to browse and manage work:

1. Go to the **Jira** view (Ctrl/Cmd + 3)
2. Enter your Jira Cloud URL, email, and [API token](https://id.atlassian.com/manage-profile/security/api-tokens)
3. Select a project
4. Browse epics and their stories
5. Click "Spawn Agent" on any story to create an AI agent with the story context pre-filled

The integration also supports:
- Adding comments to issues
- Transitioning issue status
- Automatic status updates when agents progress

## Keyboard Shortcuts

| Shortcut             | Action                   |
| -------------------- | ------------------------ |
| `Ctrl/Cmd + ``       | Toggle terminal panel    |
| `Ctrl/Cmd + B`       | Toggle sidebar           |
| `Ctrl/Cmd + D`       | Toggle docs panel        |
| `Ctrl/Cmd + 1`       | Switch to Services view  |
| `Ctrl/Cmd + 2`       | Switch to Agents view    |
| `Ctrl/Cmd + 3`       | Switch to Jira view      |
| `Escape`             | Close sidebar            |

## Tech Stack

| Layer        | Technology                                                     |
| ------------ | -------------------------------------------------------------- |
| Framework    | [Electron](https://www.electronjs.org/) 33                    |
| Bundler      | [electron-vite](https://electron-vite.org/) + [Vite](https://vitejs.dev/) 5 |
| Frontend     | [React](https://react.dev/) 18 + [TypeScript](https://www.typescriptlang.org/) 5 |
| Graph        | [React Flow](https://reactflow.dev/) (@xyflow/react)          |
| Terminal     | [xterm.js](https://xtermjs.org/) (@xterm/xterm)               |
| PTY          | [node-pty](https://github.com/nicktomlin/node-pty)            |
| State        | [Zustand](https://zustand-demo.pmnd.rs/) 4                    |
| Styling      | [Tailwind CSS](https://tailwindcss.com/) 3                    |
| Validation   | [Zod](https://zod.dev/) 3                                     |
| Graph Layout | [Dagre](https://github.com/dagrejs/dagre)                     |
| Config       | [js-yaml](https://github.com/nodeca/js-yaml)                  |
| Packaging    | [electron-builder](https://www.electron.build/) 25            |

## Development

```bash
# Start development with hot reload
npm run dev

# Type-check the project
npx tsc --noEmit

# Rebuild native modules (node-pty) if needed
npm run rebuild
```

### Project Structure

```
src/
├── main/                   # Electron main process
│   ├── agent-manager/      # AI agent lifecycle, PTY, and status detection
│   ├── config/             # YAML config loading, validation, and auto-generation
│   ├── docs/               # Project docs discovery (README, scripts, envs)
│   ├── github-manager/     # GitHub CLI wrapper (auth, PRs, remotes)
│   ├── jira-manager/       # Jira Cloud API client and credential management
│   ├── process-manager/    # Service process lifecycle and health checking
│   ├── session-usage-manager/ # Claude API rate limit tracking
│   ├── ipc/                # IPC channel handlers (main ↔ renderer)
│   └── store.ts            # Persistent app settings (electron-store)
├── preload/                # Electron preload script (context bridge)
├── renderer/               # React frontend
│   ├── components/
│   │   ├── agents/         # Kanban board, agent cards, terminals, PR viewer
│   │   ├── docs/           # Docs panel, script list, service docs
│   │   ├── graph/          # React Flow dependency graph
│   │   ├── jira/           # Jira browser, epics, stories, spawn dialog
│   │   ├── panels/         # Project header, welcome screen, service detail
│   │   ├── shared/         # Reusable UI components
│   │   └── terminal/       # xterm.js terminal views
│   ├── hooks/              # React hooks (IPC listeners, keyboard, etc.)
│   ├── stores/             # Zustand state stores
│   └── lib/                # Utilities (graph layout, status colors)
└── shared/                 # Types and constants shared between main and renderer
```

## Building

```bash
# Build for production
npm run build

# Package as a distributable (directory output)
npm run pack

# Create installer/dmg
npm run dist
```

The macOS build produces both `arm64` and `x64` DMG files. See `electron-builder.yml` for full packaging configuration.

## License

This project is not currently published under a specific open-source license. Please contact the author for usage permissions.

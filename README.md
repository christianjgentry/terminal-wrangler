# Terminal Wrangler

A desktop app for managing terminal services, Claude Code agents, GitHub PRs, and Jira — all in one place.

Built with Electron, Terminal Wrangler gives you a single pane of glass for your development stack. Define your services in a YAML config, and it handles startup ordering, health checks, live terminal output, and more.

## Features

- **Service orchestration** — start/stop services with dependency ordering and health checks
- **Integrated terminals** — full xterm.js terminal per service, powered by node-pty
- **Claude Code agent board** — Kanban view tracking agents through Idle, Planning, Building, PR Ready, and Done
- **GitHub PR tracking** — view diffs, merge status, and review state for agent-created PRs
- **Jira integration** — browse epics and stories, transition issues, add comments
- **Feature planner** — describe a feature, point it at your standards docs, and spawn a Claude agent
- **Usage monitoring** — track Claude API usage via OAuth or API key
- **Auto-generated config** — scaffolds `.terminal-wrangler.yml` from Docker Compose, package.json, and Makefiles
- **Keyboard-driven** — fast navigation with shortcuts for every panel and view

## Prerequisites

- **Node.js** 18+ (20 LTS recommended)
- **npm** (comes with Node)
- **C++ build tools** for the native `node-pty` module:
  - macOS: `xcode-select --install`
  - Linux: `sudo apt install build-essential`
  - Windows: `npm install -g windows-build-tools`

Optional, depending on which features you use:

| Tool | Required for |
|------|-------------|
| [`gh` CLI](https://cli.github.com/) | GitHub PR tracking and merge |
| Jira Cloud account + API token | Jira integration |
| [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) | Spawning agents and OAuth usage tracking |

## Quick Start

```bash
git clone https://github.com/your-org/terminal-wrangler.git
cd terminal-wrangler
npm install
npm run rebuild          # builds native node-pty module
npm run dev              # launches the app in dev mode
```

On first launch, open a project folder that contains a `.terminal-wrangler.yml` file — or use the included sample project at `sample-project/`.

## Configuration

Terminal Wrangler reads a `.terminal-wrangler.yml` file from your project root. Here is a full example:

```yaml
project:
  name: "Sample Project"
  description: "A sample project for testing Terminal Wrangler"

services:
  database:
    name: "PostgreSQL"
    command: "docker compose up postgres"
    workingDirectory: "."
    docs: |
      ## PostgreSQL Database
      Runs on port **5432**. Uses Docker.
    healthCheck:
      command: "pg_isready -h localhost -p 5432"
      interval: 5000
      retries: 3
      startDelay: 2000
    env:
      POSTGRES_PASSWORD: "dev"
    tags: [database, docker]

  redis:
    name: "Redis"
    command: "docker compose up redis"
    workingDirectory: "."
    tags: [cache, docker]

  api:
    name: "API Server"
    command: "npm run dev"
    workingDirectory: "./api"
    dependsOn: [database, redis]
    docs: |
      ## API Server
      Express.js API on port **3001**.
    env:
      DATABASE_URL: "postgresql://postgres:dev@localhost:5432/myapp"
      REDIS_URL: "redis://localhost:6379"
    tags: [backend, node]

  frontend:
    name: "Frontend Dev Server"
    command: "npm run dev"
    workingDirectory: "./frontend"
    dependsOn: [api]
    tags: [frontend, react]
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `project.name` | string | Display name for the project |
| `project.description` | string | Short description shown in the UI |
| `services.<id>.name` | string | Human-readable service name |
| `services.<id>.command` | string | Shell command to start the service |
| `services.<id>.workingDirectory` | string | Working directory (relative to project root) |
| `services.<id>.dependsOn` | string[] | Service IDs that must start first |
| `services.<id>.docs` | string | Markdown documentation shown in the docs panel |
| `services.<id>.healthCheck.command` | string | Shell command that exits 0 when healthy |
| `services.<id>.healthCheck.interval` | number | Milliseconds between checks |
| `services.<id>.healthCheck.retries` | number | Failures before marking unhealthy |
| `services.<id>.healthCheck.startDelay` | number | Milliseconds to wait before first check |
| `services.<id>.env` | object | Environment variables passed to the process |
| `services.<id>.tags` | string[] | Tags for filtering and display |

You can also auto-generate a config: open a project folder and Terminal Wrangler will offer to scaffold a `.terminal-wrangler.yml` from any Docker Compose files, `package.json` scripts, or Makefiles it finds.

## Connections Setup

### GitHub

1. Install the [GitHub CLI](https://cli.github.com/)
2. Authenticate: `gh auth login`
3. Terminal Wrangler auto-detects the git remote from your project's `.git/config`

PR tracking, diff viewing, and merge actions will be available on the Agents tab for any agent that creates a pull request.

### Jira

1. Generate an API token at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Open the **Jira** tab in Terminal Wrangler
3. Enter your Jira Cloud URL (e.g. `https://yourteam.atlassian.net`), email, and API token
4. Set a project key to browse epics and stories

### Claude Code

1. Install the [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) and run `claude` once to authenticate
2. OAuth credentials are auto-detected from `~/.claude/.credentials.json`
3. Alternatively, set an Anthropic API key in the app settings (gear icon) for API-key-based usage tracking

## Usage Guide

### Services Tab (`Cmd+1`)

Start and stop individual services or use "Start All" for dependency-ordered launch. Each service gets its own terminal, health status indicator, and docs panel.

### Agents Tab (`Cmd+2`)

Create Claude Code agents with a prompt and working directory. The Kanban board auto-sorts agents by detected status:

- **Idle** — waiting or just created
- **Planning** — agent is in plan mode
- **Building** — actively writing code
- **PR Ready** — pull request created, awaiting review
- **Done** — work complete

Each agent card shows subagent count, context usage, task progress, and linked PRs.

### Jira Tab (`Cmd+3`)

- **Browse mode** — navigate epics, expand into stories, view details, transition issues
- **Planner mode** — select a standards directory, describe a feature, and spawn a Claude agent pre-loaded with your team's conventions

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+1` | Switch to Services view |
| `Cmd+2` | Switch to Agents view |
| `Cmd+3` | Switch to Jira view |
| `` Cmd+` `` | Toggle terminal panel |
| `Cmd+B` | Toggle sidebar |
| `Cmd+D` | Toggle docs panel |
| `Escape` | Close sidebar |

On Linux/Windows, use `Ctrl` instead of `Cmd`.

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the app in development mode with hot reload |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build |
| `npm run rebuild` | Rebuild native modules (`node-pty`) for current Electron version |
| `npm run pack` | Package the app into a directory (no installer) |
| `npm run dist` | Build and package into a distributable installer |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Electron App                      │
│                                                      │
│  ┌──────────┐    IPC     ┌──────────┐   Context     │
│  │   Main   │◄──────────►│ Preload  │───Bridge──►   │
│  │ Process  │            └──────────┘            │   │
│  │          │                                    │   │
│  │ • PTY    │            ┌──────────────────┐    │   │
│  │ • Config │            │    Renderer      │◄───┘   │
│  │ • Agents │            │                  │        │
│  │ • GitHub │            │ • React + Zustand│        │
│  │ • Jira   │            │ • xterm.js       │        │
│  │ • Usage  │            │ • Tailwind CSS   │        │
│  └──────────┘            └──────────────────┘        │
└─────────────────────────────────────────────────────┘
```

- **Main process** — manages PTY processes, agent lifecycles, GitHub/Jira API calls, config watching, and session usage tracking
- **Preload** — exposes a typed `window.api` bridge via Electron's `contextBridge`
- **Renderer** — React UI with Zustand stores, xterm.js terminals, and Tailwind styling

### Directory Structure

```
src/
├── main/                    # Main process
│   ├── agent-manager/       # Claude Code agent lifecycle
│   ├── config/              # YAML config loading & watching
│   ├── docs/                # Docs panel backend
│   ├── github-manager/      # GitHub CLI integration
│   ├── ipc/                 # IPC handler registration
│   ├── jira-manager/        # Jira REST API client
│   ├── process-manager/     # Service PTY management
│   ├── session-usage-manager/ # Claude usage tracking
│   └── standards-manager/   # Standards file management
├── preload/                 # Context bridge (window.api)
├── renderer/                # React frontend
│   ├── components/          # UI components (agents, jira, graph, etc.)
│   ├── hooks/               # React hooks
│   ├── stores/              # Zustand state stores
│   └── lib/                 # Utilities
└── shared/                  # Types and IPC channel definitions
```

## Tech Stack

| Dependency | Purpose |
|-----------|---------|
| Electron 33 | Desktop shell |
| electron-vite | Build tooling |
| React 18 | UI framework |
| Zustand | State management |
| Tailwind CSS | Styling |
| xterm.js | Terminal emulator (frontend) |
| node-pty | Pseudoterminal (backend) |
| @xyflow/react | Service dependency graph |
| js-yaml | YAML config parsing |
| zod | Schema validation |
| chokidar | File watching |
| electron-store | Persistent settings |
| react-markdown | Markdown rendering |

## Building for Distribution

```bash
npm run build && npm run dist
```

On macOS this produces a DMG installer for both arm64 and x64 architectures. Output goes to the `dist/` directory.

Code signing and notarization settings are in `electron-builder.yml`.

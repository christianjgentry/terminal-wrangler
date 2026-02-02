import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, basename, relative } from 'path'
import yaml from 'js-yaml'

// ── Types ────────────────────────────────────────────────────

interface DetectedService {
  id: string
  name: string
  command: string
  workingDirectory: string
  dependsOn: string[]
  healthCheck?: { command: string; interval: number; retries: number; startDelay?: number }
  env?: Record<string, string>
  tags: string[]
  priority: number
}

export interface GenerateResult {
  yaml: string
  config: {
    project: { name: string; description?: string }
    services: Record<string, DetectedService>
  }
  detectedFiles: string[]
}

// ── Helpers ──────────────────────────────────────────────────

function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return null
  }
}

function parsePkgJson(path: string): Record<string, unknown> | null {
  const raw = readFileSafe(path)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function parseYamlFile(path: string): Record<string, unknown> | null {
  const raw = readFileSafe(path)
  if (!raw) return null
  try {
    return yaml.load(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractPortFromCommand(cmd: string): number | null {
  const portMatch = cmd.match(/(?:--port|PORT=|-p\s+)\s*(\d+)/)
  if (portMatch) return parseInt(portMatch[1], 10)
  const colonMatch = cmd.match(/:(\d{4,5})/)
  if (colonMatch) return parseInt(colonMatch[1], 10)
  return null
}

function listDirectories(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => {
        try {
          return statSync(join(dir, f)).isDirectory()
        } catch {
          return false
        }
      })
  } catch {
    return []
  }
}

// ── Detectors ────────────────────────────────────────────────

const DOCKER_COMPOSE_FILES = [
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml'
]

const SKIP_SCRIPTS = new Set([
  'build',
  'test',
  'lint',
  'format',
  'clean',
  'prepare',
  'postinstall',
  'prebuild',
  'pretest',
  'postbuild',
  'posttest',
  'eject',
  'type-check',
  'typecheck'
])

const LONG_RUNNING_SCRIPTS: Record<string, { name: string; priority: number }> = {
  dev: { name: 'Dev Server', priority: 2 },
  'start:dev': { name: 'Dev Server', priority: 2 },
  start: { name: 'Start', priority: 1 },
  serve: { name: 'Serve', priority: 1 },
  storybook: { name: 'Storybook', priority: 2 },
  'test:watch': { name: 'Test Watch', priority: 3 },
  'test:dev': { name: 'Test Watch', priority: 3 },
  watch: { name: 'Watch', priority: 2 },
  'dev:server': { name: 'Dev Server', priority: 2 },
  'start:debug': { name: 'Debug Server', priority: 2 }
}

const LONG_RUNNING_MAKE_TARGETS = new Set([
  'dev',
  'serve',
  'run',
  'start',
  'watch',
  'server',
  'up'
])

const IMAGE_HEALTH_CHECKS: Record<string, string> = {
  postgres: 'pg_isready',
  redis: 'redis-cli ping',
  mongo: 'mongosh --eval "db.runCommand(\'ping\')"',
  mysql: 'mysqladmin ping',
  mariadb: 'mysqladmin ping'
}

const IMAGE_TAGS: Record<string, string[]> = {
  postgres: ['database'],
  mysql: ['database'],
  mariadb: ['database'],
  mongo: ['database'],
  redis: ['cache'],
  rabbitmq: ['messaging'],
  kafka: ['messaging'],
  nats: ['messaging'],
  elasticsearch: ['search'],
  nginx: ['proxy'],
  traefik: ['proxy']
}

function detectDockerCompose(
  rootPath: string,
  detectedFiles: string[]
): DetectedService[] {
  const services: DetectedService[] = []

  for (const filename of DOCKER_COMPOSE_FILES) {
    const filePath = join(rootPath, filename)
    if (!existsSync(filePath)) continue

    detectedFiles.push(filename)
    const doc = parseYamlFile(filePath)
    if (!doc || !doc.services || typeof doc.services !== 'object') continue

    const composeServices = doc.services as Record<string, Record<string, unknown>>

    for (const [name, svc] of Object.entries(composeServices)) {
      const id = slugify(name)
      const image = (svc.image as string) || ''
      const imageName = image.split(':')[0].split('/').pop() || ''

      // Build dependsOn from depends_on
      const dependsOn: string[] = []
      if (svc.depends_on) {
        if (Array.isArray(svc.depends_on)) {
          dependsOn.push(...svc.depends_on.map((d: string) => slugify(d)))
        } else if (typeof svc.depends_on === 'object') {
          dependsOn.push(...Object.keys(svc.depends_on).map((d) => slugify(d)))
        }
      }

      // Extract ports
      const ports = (svc.ports as string[]) || []
      let hostPort: number | null = null
      if (ports.length > 0) {
        const portStr = String(ports[0])
        const match = portStr.match(/(\d+):/)
        if (match) hostPort = parseInt(match[1], 10)
      }

      // Infer health check
      let healthCheck: DetectedService['healthCheck'] | undefined
      for (const [key, cmd] of Object.entries(IMAGE_HEALTH_CHECKS)) {
        if (imageName.includes(key)) {
          healthCheck = { command: cmd, interval: 5000, retries: 5, startDelay: 2000 }
          break
        }
      }
      if (!healthCheck && hostPort) {
        healthCheck = {
          command: `curl -sf http://localhost:${hostPort}/`,
          interval: 5000,
          retries: 5,
          startDelay: 3000
        }
      }

      // Extract env vars
      let env: Record<string, string> | undefined
      if (svc.environment) {
        env = {}
        if (Array.isArray(svc.environment)) {
          for (const e of svc.environment) {
            const [k, ...rest] = String(e).split('=')
            env[k] = rest.join('=')
          }
        } else if (typeof svc.environment === 'object') {
          for (const [k, v] of Object.entries(svc.environment as Record<string, string>)) {
            env[k] = String(v)
          }
        }
      }

      // Build tags
      const tags = ['docker']
      for (const [key, tagList] of Object.entries(IMAGE_TAGS)) {
        if (imageName.includes(key)) {
          tags.push(...tagList)
          break
        }
      }

      services.push({
        id,
        name,
        command: `docker compose up ${name}`,
        workingDirectory: '.',
        dependsOn,
        healthCheck,
        env,
        tags,
        priority: 1
      })
    }

    break // Only process the first compose file found
  }

  return services
}

function detectPackageManager(rootPath: string): string {
  if (existsSync(join(rootPath, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(rootPath, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

function detectPackageJsonScripts(
  rootPath: string,
  detectedFiles: string[],
  prefix = '',
  workingDir = '.'
): DetectedService[] {
  const services: DetectedService[] = []
  const pkgPath = join(rootPath, 'package.json')
  const pkg = parsePkgJson(pkgPath)
  if (!pkg) return services

  if (!prefix) detectedFiles.push('package.json')

  const scripts = (pkg.scripts || {}) as Record<string, string>
  const pm = detectPackageManager(rootPath)

  for (const [scriptName, scriptCmd] of Object.entries(scripts)) {
    if (SKIP_SCRIPTS.has(scriptName)) continue

    const info = LONG_RUNNING_SCRIPTS[scriptName]
    if (!info) {
      // Also include scripts containing "watch", "dev", or "serve" in name
      const looksLongRunning =
        scriptName.includes('watch') ||
        scriptName.includes('dev') ||
        scriptName.includes('serve') ||
        scriptName.includes('start')
      if (!looksLongRunning) continue
    }

    const id = prefix ? `${prefix}-${slugify(scriptName)}` : slugify(scriptName)
    const name = info?.name || scriptName
    const priority = info?.priority || 2

    const tags: string[] = ['node']
    if (scriptName.includes('test')) tags.push('test')
    if (scriptName.includes('storybook')) tags.push('frontend', 'storybook')

    let healthCheck: DetectedService['healthCheck'] | undefined
    const port = extractPortFromCommand(scriptCmd)
    if (port) {
      healthCheck = {
        command: `curl -sf http://localhost:${port}/`,
        interval: 5000,
        retries: 3,
        startDelay: 3000
      }
    }

    services.push({
      id,
      name: prefix ? `${prefix}: ${name}` : name,
      command: `${pm} run ${scriptName}`,
      workingDirectory: workingDir,
      dependsOn: [],
      healthCheck,
      tags,
      priority
    })
  }

  return services
}

function resolveWorkspaceGlobs(rootPath: string, patterns: string[]): string[] {
  const dirs: string[] = []
  for (const pattern of patterns) {
    // Handle simple glob patterns like "packages/*"
    if (pattern.endsWith('/*') || pattern.endsWith('/**')) {
      const base = pattern.replace(/\/\*+$/, '')
      const absBase = join(rootPath, base)
      if (existsSync(absBase)) {
        for (const dir of listDirectories(absBase)) {
          dirs.push(join(base, dir))
        }
      }
    } else if (!pattern.includes('*')) {
      // Direct path
      if (existsSync(join(rootPath, pattern))) {
        dirs.push(pattern)
      }
    }
  }
  return dirs
}

function detectMonorepo(
  rootPath: string,
  detectedFiles: string[]
): DetectedService[] {
  const services: DetectedService[] = []
  let workspaceDirs: string[] = []

  // Check package.json workspaces
  const pkg = parsePkgJson(join(rootPath, 'package.json'))
  if (pkg?.workspaces) {
    const patterns = Array.isArray(pkg.workspaces)
      ? (pkg.workspaces as string[])
      : ((pkg.workspaces as { packages?: string[] }).packages || [])
    workspaceDirs = resolveWorkspaceGlobs(rootPath, patterns)
  }

  // Check pnpm-workspace.yaml
  if (workspaceDirs.length === 0) {
    const pnpmWs = join(rootPath, 'pnpm-workspace.yaml')
    if (existsSync(pnpmWs)) {
      detectedFiles.push('pnpm-workspace.yaml')
      const doc = parseYamlFile(pnpmWs) as { packages?: string[] } | null
      if (doc?.packages) {
        workspaceDirs = resolveWorkspaceGlobs(rootPath, doc.packages)
      }
    }
  }

  // Check lerna.json
  if (workspaceDirs.length === 0) {
    const lernaPath = join(rootPath, 'lerna.json')
    if (existsSync(lernaPath)) {
      detectedFiles.push('lerna.json')
      const lerna = parsePkgJson(lernaPath)
      if (lerna?.packages && Array.isArray(lerna.packages)) {
        workspaceDirs = resolveWorkspaceGlobs(rootPath, lerna.packages as string[])
      }
    }
  }

  if (workspaceDirs.length === 0) return services

  for (const dir of workspaceDirs) {
    const absDir = join(rootPath, dir)
    const pkgPath = join(absDir, 'package.json')
    if (!existsSync(pkgPath)) continue

    const pkgName = basename(dir)
    const detected = detectPackageJsonScripts(absDir, detectedFiles, pkgName, dir)
    services.push(...detected)
  }

  return services
}

function detectMakefile(
  rootPath: string,
  detectedFiles: string[]
): DetectedService[] {
  const services: DetectedService[] = []
  const filenames = ['Makefile', 'makefile', 'GNUmakefile']

  for (const filename of filenames) {
    const filePath = join(rootPath, filename)
    const content = readFileSafe(filePath)
    if (!content) continue

    detectedFiles.push(filename)

    const targetRegex = /^([a-zA-Z_][\w-]*)\s*:/gm
    let match: RegExpExecArray | null
    while ((match = targetRegex.exec(content)) !== null) {
      const target = match[1]
      if (!LONG_RUNNING_MAKE_TARGETS.has(target)) continue

      services.push({
        id: `make-${slugify(target)}`,
        name: `make ${target}`,
        command: `make ${target}`,
        workingDirectory: '.',
        dependsOn: [],
        tags: ['make'],
        priority: 2
      })
    }

    break
  }

  return services
}

function detectProcfile(
  rootPath: string,
  detectedFiles: string[]
): DetectedService[] {
  const services: DetectedService[] = []
  const filePath = join(rootPath, 'Procfile')
  const content = readFileSafe(filePath)
  if (!content) return services

  detectedFiles.push('Procfile')

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue

    const name = trimmed.slice(0, colonIdx).trim()
    const command = trimmed.slice(colonIdx + 1).trim()
    if (!name || !command) continue

    services.push({
      id: slugify(name),
      name,
      command,
      workingDirectory: '.',
      dependsOn: [],
      tags: ['procfile'],
      priority: 1
    })
  }

  return services
}

function detectPython(
  rootPath: string,
  detectedFiles: string[]
): DetectedService[] {
  const services: DetectedService[] = []

  // Django
  if (existsSync(join(rootPath, 'manage.py'))) {
    detectedFiles.push('manage.py')
    services.push({
      id: 'django',
      name: 'Django Server',
      command: 'python manage.py runserver',
      workingDirectory: '.',
      dependsOn: [],
      healthCheck: {
        command: 'curl -sf http://localhost:8000/',
        interval: 5000,
        retries: 3,
        startDelay: 3000
      },
      tags: ['python', 'backend', 'django'],
      priority: 1
    })
  }

  // pyproject.toml
  const pyprojectPath = join(rootPath, 'pyproject.toml')
  const pyproject = readFileSafe(pyprojectPath)
  if (pyproject) {
    detectedFiles.push('pyproject.toml')

    if (pyproject.includes('fastapi')) {
      services.push({
        id: 'fastapi',
        name: 'FastAPI Server',
        command: 'uvicorn main:app --reload',
        workingDirectory: '.',
        dependsOn: [],
        healthCheck: {
          command: 'curl -sf http://localhost:8000/docs',
          interval: 5000,
          retries: 3,
          startDelay: 3000
        },
        tags: ['python', 'backend', 'fastapi'],
        priority: 1
      })
    }

    if (pyproject.includes('flask')) {
      services.push({
        id: 'flask',
        name: 'Flask Server',
        command: 'flask run --reload',
        workingDirectory: '.',
        dependsOn: [],
        healthCheck: {
          command: 'curl -sf http://localhost:5000/',
          interval: 5000,
          retries: 3,
          startDelay: 3000
        },
        tags: ['python', 'backend', 'flask'],
        priority: 1
      })
    }

    if (pyproject.includes('celery')) {
      services.push({
        id: 'celery-worker',
        name: 'Celery Worker',
        command: 'celery -A app worker --loglevel=info',
        workingDirectory: '.',
        dependsOn: [],
        tags: ['python', 'worker', 'celery'],
        priority: 2
      })
    }
  }

  // requirements.txt fallback
  if (!pyproject) {
    const reqPath = join(rootPath, 'requirements.txt')
    const reqs = readFileSafe(reqPath)
    if (reqs) {
      detectedFiles.push('requirements.txt')

      if (reqs.includes('fastapi') || reqs.includes('uvicorn')) {
        services.push({
          id: 'fastapi',
          name: 'FastAPI Server',
          command: 'uvicorn main:app --reload',
          workingDirectory: '.',
          dependsOn: [],
          healthCheck: {
            command: 'curl -sf http://localhost:8000/docs',
            interval: 5000,
            retries: 3,
            startDelay: 3000
          },
          tags: ['python', 'backend', 'fastapi'],
          priority: 1
        })
      }

      if (reqs.includes('flask') || reqs.includes('Flask')) {
        services.push({
          id: 'flask',
          name: 'Flask Server',
          command: 'flask run --reload',
          workingDirectory: '.',
          dependsOn: [],
          healthCheck: {
            command: 'curl -sf http://localhost:5000/',
            interval: 5000,
            retries: 3,
            startDelay: 3000
          },
          tags: ['python', 'backend', 'flask'],
          priority: 1
        })
      }

      if (reqs.includes('celery')) {
        services.push({
          id: 'celery-worker',
          name: 'Celery Worker',
          command: 'celery -A app worker --loglevel=info',
          workingDirectory: '.',
          dependsOn: [],
          tags: ['python', 'worker', 'celery'],
          priority: 2
        })
      }
    }
  }

  return services
}

function detectGo(
  rootPath: string,
  detectedFiles: string[]
): DetectedService[] {
  const services: DetectedService[] = []

  if (!existsSync(join(rootPath, 'go.mod'))) return services
  detectedFiles.push('go.mod')

  const goMod = readFileSafe(join(rootPath, 'go.mod')) || ''
  const hasWeb =
    goMod.includes('gin-gonic') ||
    goMod.includes('labstack/echo') ||
    goMod.includes('gofiber/fiber')

  // Check for cmd/* binaries
  const cmdDir = join(rootPath, 'cmd')
  if (existsSync(cmdDir)) {
    const bins = listDirectories(cmdDir)
    for (const bin of bins) {
      if (existsSync(join(cmdDir, bin, 'main.go'))) {
        services.push({
          id: `go-${slugify(bin)}`,
          name: `Go: ${bin}`,
          command: `go run ./cmd/${bin}`,
          workingDirectory: '.',
          dependsOn: [],
          healthCheck: hasWeb
            ? { command: 'curl -sf http://localhost:8080/', interval: 5000, retries: 3, startDelay: 3000 }
            : undefined,
          tags: ['go', 'backend'],
          priority: 1
        })
      }
    }
  }

  // Fallback: single binary at root
  if (services.length === 0) {
    services.push({
      id: 'go-app',
      name: 'Go App',
      command: 'go run .',
      workingDirectory: '.',
      dependsOn: [],
      healthCheck: hasWeb
        ? { command: 'curl -sf http://localhost:8080/', interval: 5000, retries: 3, startDelay: 3000 }
        : undefined,
      tags: ['go', 'backend'],
      priority: 1
    })
  }

  return services
}

function detectRust(
  rootPath: string,
  detectedFiles: string[]
): DetectedService[] {
  const services: DetectedService[] = []

  const cargoPath = join(rootPath, 'Cargo.toml')
  const cargo = readFileSafe(cargoPath)
  if (!cargo) return services

  detectedFiles.push('Cargo.toml')

  const hasWeb =
    cargo.includes('actix-web') ||
    cargo.includes('axum') ||
    cargo.includes('rocket')

  // Check for workspace members with [[bin]] targets
  const binMatch = cargo.match(/\[\[bin\]\]\s*\n\s*name\s*=\s*"([^"]+)"/g)
  if (binMatch) {
    for (const block of binMatch) {
      const nameMatch = block.match(/name\s*=\s*"([^"]+)"/)
      if (nameMatch) {
        const binName = nameMatch[1]
        services.push({
          id: `rust-${slugify(binName)}`,
          name: `Rust: ${binName}`,
          command: `cargo run --bin ${binName}`,
          workingDirectory: '.',
          dependsOn: [],
          healthCheck: hasWeb
            ? { command: 'curl -sf http://localhost:8080/', interval: 5000, retries: 5, startDelay: 5000 }
            : undefined,
          tags: ['rust', 'backend'],
          priority: 1
        })
      }
    }
  }

  if (services.length === 0) {
    services.push({
      id: 'rust-app',
      name: 'Rust App',
      command: 'cargo run',
      workingDirectory: '.',
      dependsOn: [],
      healthCheck: hasWeb
        ? { command: 'curl -sf http://localhost:8080/', interval: 5000, retries: 5, startDelay: 5000 }
        : undefined,
      tags: ['rust', 'backend'],
      priority: 1
    })
  }

  return services
}

// ── Dependency Inference ─────────────────────────────────────

function inferDependencies(services: DetectedService[]): void {
  const byTag = new Map<string, string[]>()
  for (const svc of services) {
    for (const tag of svc.tags) {
      const list = byTag.get(tag) || []
      list.push(svc.id)
      byTag.set(tag, list)
    }
  }

  const databaseIds = [
    ...(byTag.get('database') || []),
    ...(byTag.get('cache') || [])
  ]
  const backendIds = [
    ...(byTag.get('backend') || []),
    ...(byTag.get('node') || []),
    ...(byTag.get('python') || []),
    ...(byTag.get('go') || []),
    ...(byTag.get('rust') || [])
  ]
  const frontendIds = [
    ...(byTag.get('frontend') || []),
    ...(byTag.get('storybook') || [])
  ]
  const workerIds = [
    ...(byTag.get('worker') || []),
    ...(byTag.get('celery') || [])
  ]

  const serviceIds = new Set(services.map((s) => s.id))

  for (const svc of services) {
    const deps = new Set(svc.dependsOn)

    // Backend depends on database/cache
    if (
      svc.tags.some((t) => ['backend', 'node', 'python', 'go', 'rust'].includes(t))
    ) {
      for (const dbId of databaseIds) {
        if (dbId !== svc.id && serviceIds.has(dbId)) deps.add(dbId)
      }
    }

    // Frontend depends on backend
    if (svc.tags.some((t) => ['frontend', 'storybook'].includes(t))) {
      for (const beId of backendIds) {
        if (beId !== svc.id && serviceIds.has(beId)) deps.add(beId)
      }
    }

    // Workers depend on backend
    if (svc.tags.some((t) => ['worker', 'celery'].includes(t))) {
      for (const beId of backendIds) {
        if (beId !== svc.id && serviceIds.has(beId)) deps.add(beId)
      }
    }

    // Avoid backends depending on themselves via tag overlap
    // (e.g., a node service tagged 'backend' shouldn't depend on itself)
    deps.delete(svc.id)

    svc.dependsOn = [...deps]
  }

  // Deduplicate: don't let frontend tags also pull in database (already via backend chain)
  // This is acceptable as transitive - keep it simple
}

// ── Main Generator ───────────────────────────────────────────

export class ConfigGenerator {
  generate(projectPath: string): GenerateResult {
    const detectedFiles: string[] = []
    const allServices: DetectedService[] = []
    const seenIds = new Set<string>()

    const addServices = (detected: DetectedService[]): void => {
      for (const svc of detected) {
        // Deduplicate by id
        if (seenIds.has(svc.id)) continue
        seenIds.add(svc.id)
        allServices.push(svc)
      }
    }

    // Run detectors in priority order
    addServices(detectDockerCompose(projectPath, detectedFiles))
    addServices(detectPackageJsonScripts(projectPath, detectedFiles))
    addServices(detectMonorepo(projectPath, detectedFiles))
    addServices(detectMakefile(projectPath, detectedFiles))
    addServices(detectProcfile(projectPath, detectedFiles))
    addServices(detectPython(projectPath, detectedFiles))
    addServices(detectGo(projectPath, detectedFiles))
    addServices(detectRust(projectPath, detectedFiles))

    // Infer dependencies across services
    inferDependencies(allServices)

    // Build config object
    const projectName = basename(projectPath)
    const serviceMap: Record<string, DetectedService> = {}
    for (const svc of allServices) {
      serviceMap[svc.id] = svc
    }

    const config = {
      project: {
        name: projectName,
        description: `Auto-generated config for ${projectName}`
      },
      services: serviceMap
    }

    // Build YAML-friendly output (strip internal fields like priority)
    const yamlObj: Record<string, unknown> = {
      project: config.project,
      services: {} as Record<string, unknown>
    }

    const yamlServices = yamlObj.services as Record<string, unknown>
    for (const svc of allServices) {
      const entry: Record<string, unknown> = {
        name: svc.name,
        command: svc.command
      }
      if (svc.workingDirectory !== '.') {
        entry.workingDirectory = svc.workingDirectory
      }
      if (svc.dependsOn.length > 0) {
        entry.dependsOn = svc.dependsOn
      }
      if (svc.healthCheck) {
        entry.healthCheck = svc.healthCheck
      }
      if (svc.env && Object.keys(svc.env).length > 0) {
        entry.env = svc.env
      }
      if (svc.tags.length > 0) {
        entry.tags = svc.tags
      }
      yamlServices[svc.id] = entry
    }

    const yamlStr = yaml.dump(yamlObj, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
      quotingType: '"'
    })

    return {
      yaml: yamlStr,
      config,
      detectedFiles: [...new Set(detectedFiles)]
    }
  }
}

export const configGenerator = new ConfigGenerator()

import { readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import type { DetectedScript, ProjectDocsData } from '@shared/types'

const LONG_RUNNING_PATTERNS = /\b(dev|start|serve|watch|server|up)\b/i

const ENV_RULES: Array<{ pattern: RegExp; env: string }> = [
  { pattern: /\b(dev|develop)\b/i, env: 'dev' },
  { pattern: /\bstaging\b/i, env: 'staging' },
  { pattern: /\b(prod|production)\b/i, env: 'production' },
  { pattern: /\b(test|spec)\b/i, env: 'test' },
  { pattern: /\b(build|compile)\b/i, env: 'build' },
  { pattern: /\b(lint|format|prettier|eslint)\b/i, env: 'quality' },
  { pattern: /\b(docker|compose|infra)\b/i, env: 'infrastructure' }
]

const ENV_ORDER = ['dev', 'production', 'staging', 'test', 'build', 'quality', 'infrastructure', 'other']

function classifyEnvironment(name: string, command: string): string {
  const combined = `${name} ${command}`

  for (const rule of ENV_RULES) {
    if (rule.pattern.test(combined)) {
      return rule.env
    }
  }

  // Special case: bare "start" -> production
  if (/^start$/i.test(name)) {
    return 'production'
  }

  return 'other'
}

function readReadme(projectPath: string): string | null {
  const variants = ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README', 'readme']
  for (const name of variants) {
    const filePath = join(projectPath, name)
    if (existsSync(filePath)) {
      try {
        return readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }
    }
  }
  return null
}

function detectPackageJsonScripts(projectPath: string): DetectedScript[] {
  const scripts: DetectedScript[] = []
  const pkgPath = join(projectPath, 'package.json')

  if (!existsSync(pkgPath)) return scripts

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    if (!pkg.scripts || typeof pkg.scripts !== 'object') return scripts

    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      if (typeof cmd !== 'string') continue
      const env = classifyEnvironment(name, cmd)
      scripts.push({
        id: `pkg-${name}`,
        name: `npm run ${name}`,
        command: `npm run ${name}`,
        source: 'package.json',
        environment: env,
        workingDirectory: projectPath,
        isLongRunning: LONG_RUNNING_PATTERNS.test(name)
      })
    }
  } catch {
    // Invalid JSON, skip
  }

  return scripts
}

function detectMakefileTargets(projectPath: string): DetectedScript[] {
  const scripts: DetectedScript[] = []
  const variants = ['Makefile', 'makefile', 'GNUmakefile']

  let makefilePath: string | null = null
  let makefileName = 'Makefile'
  for (const name of variants) {
    const filePath = join(projectPath, name)
    if (existsSync(filePath)) {
      makefilePath = filePath
      makefileName = name
      break
    }
  }

  if (!makefilePath) return scripts

  try {
    const content = readFileSync(makefilePath, 'utf-8')
    const targetRegex = /^([a-zA-Z_][\w.-]*)\s*:/gm
    let match: RegExpExecArray | null

    while ((match = targetRegex.exec(content)) !== null) {
      const target = match[1]
      // Skip internal targets starting with . or common non-runnable ones
      if (target.startsWith('.') || target === 'PHONY') continue

      const env = classifyEnvironment(target, '')
      scripts.push({
        id: `make-${target}`,
        name: `make ${target}`,
        command: `make ${target}`,
        source: makefileName,
        environment: env,
        workingDirectory: projectPath,
        isLongRunning: LONG_RUNNING_PATTERNS.test(target)
      })
    }
  } catch {
    // Can't read Makefile, skip
  }

  return scripts
}

function detectDockerComposeServices(projectPath: string): DetectedScript[] {
  const scripts: DetectedScript[] = []
  const variants = [
    'docker-compose.yml',
    'docker-compose.yaml',
    'compose.yml',
    'compose.yaml'
  ]

  let composeFile: string | null = null
  let composeName = 'docker-compose.yml'
  for (const name of variants) {
    const filePath = join(projectPath, name)
    if (existsSync(filePath)) {
      composeFile = filePath
      composeName = name
      break
    }
  }

  if (!composeFile) return scripts

  try {
    const content = readFileSync(composeFile, 'utf-8')
    // Simple YAML parsing for service names under services: key
    const lines = content.split('\n')
    let inServices = false
    let baseIndent = -1

    for (const line of lines) {
      const trimmed = line.trimStart()
      const indent = line.length - trimmed.length

      if (trimmed === 'services:' || trimmed.startsWith('services:')) {
        inServices = true
        baseIndent = -1
        continue
      }

      if (inServices) {
        // End of services block if we hit a top-level key
        if (indent === 0 && trimmed.length > 0 && !trimmed.startsWith('#')) {
          break
        }

        // First indented line sets the service indent level
        if (baseIndent === -1 && indent > 0 && trimmed.includes(':')) {
          baseIndent = indent
        }

        // Service name at the base indent level
        if (baseIndent > 0 && indent === baseIndent && trimmed.includes(':')) {
          const serviceName = trimmed.split(':')[0].trim()
          if (serviceName && !serviceName.startsWith('#')) {
            scripts.push({
              id: `compose-${serviceName}`,
              name: `docker compose up ${serviceName}`,
              command: `docker compose up ${serviceName}`,
              source: composeName,
              environment: 'infrastructure',
              workingDirectory: projectPath,
              isLongRunning: true
            })
          }
        }
      }
    }

    // Also add the "up all" command
    if (scripts.length > 0) {
      scripts.unshift({
        id: 'compose-all',
        name: 'docker compose up',
        command: 'docker compose up',
        source: composeName,
        environment: 'infrastructure',
        workingDirectory: projectPath,
        isLongRunning: true
      })
    }
  } catch {
    // Can't parse compose file, skip
  }

  return scripts
}

export function getProjectDocs(projectPath: string): ProjectDocsData {
  const readme = readReadme(projectPath)

  const allScripts = [
    ...detectPackageJsonScripts(projectPath),
    ...detectMakefileTargets(projectPath),
    ...detectDockerComposeServices(projectPath)
  ]

  // Deduplicate by id
  const seen = new Set<string>()
  const scripts = allScripts.filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })

  // Collect and order environments
  const envSet = new Set(scripts.map((s) => s.environment))
  const environments = ENV_ORDER.filter((e) => envSet.has(e))

  const isNpmProject = existsSync(join(projectPath, 'package.json'))

  return { readme, scripts, environments, isNpmProject }
}

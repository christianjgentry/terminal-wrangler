import { readFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import yaml from 'js-yaml'
import { configSchema } from './schema'
import type { ProjectConfig, ServiceConfig } from '@shared/types'

const CONFIG_FILENAME = '.terminal-wrangler.yml'
const ALT_CONFIG_FILENAME = '.terminal-wrangler.yaml'

export class ConfigLoader {
  private projectPath: string | null = null
  private watcher: import('chokidar').FSWatcher | null = null

  async load(projectPath: string): Promise<ProjectConfig> {
    this.projectPath = projectPath

    const configPath = this.findConfigFile(projectPath)
    if (!configPath) {
      throw new Error(
        `No ${CONFIG_FILENAME} found in ${projectPath}. Create one to define your services.`
      )
    }

    const raw = readFileSync(configPath, 'utf-8')
    const parsed = yaml.load(raw)
    const validated = configSchema.parse(parsed)

    // Transform to internal types with resolved paths and IDs
    const services: Record<string, ServiceConfig> = {}
    for (const [id, svc] of Object.entries(validated.services)) {
      services[id] = {
        id,
        name: svc.name || id,
        command: svc.command,
        workingDirectory: resolve(projectPath, svc.workingDirectory),
        dependsOn: svc.dependsOn,
        docs: svc.docs,
        healthCheck: svc.healthCheck
          ? {
              command: svc.healthCheck.command,
              interval: svc.healthCheck.interval,
              retries: svc.healthCheck.retries,
              startDelay: svc.healthCheck.startDelay
            }
          : undefined,
        env: svc.env,
        tags: svc.tags
      }
    }

    // Validate dependency references
    for (const [id, svc] of Object.entries(services)) {
      for (const dep of svc.dependsOn) {
        if (!services[dep]) {
          throw new Error(
            `Service "${id}" depends on "${dep}", but "${dep}" is not defined in config.`
          )
        }
      }
    }

    // Check for circular dependencies
    this.checkCircularDeps(services)

    return {
      project: {
        name: validated.project.name,
        description: validated.project.description
      },
      services
    }
  }

  async watch(
    projectPath: string,
    onChange: (config: ProjectConfig) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    await this.stopWatching()

    const configPath = this.findConfigFile(projectPath)
    if (!configPath) return

    const chokidar = await import('chokidar')
    this.watcher = chokidar.watch(configPath, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 }
    })

    this.watcher.on('change', async () => {
      try {
        const config = await this.load(projectPath)
        onChange(config)
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }

  private findConfigFile(projectPath: string): string | null {
    const primary = join(projectPath, CONFIG_FILENAME)
    if (existsSync(primary)) return primary

    const alt = join(projectPath, ALT_CONFIG_FILENAME)
    if (existsSync(alt)) return alt

    return null
  }

  private checkCircularDeps(services: Record<string, ServiceConfig>): void {
    const visited = new Set<string>()
    const inStack = new Set<string>()

    const visit = (id: string, path: string[]): void => {
      if (inStack.has(id)) {
        const cycle = [...path.slice(path.indexOf(id)), id].join(' -> ')
        throw new Error(`Circular dependency detected: ${cycle}`)
      }
      if (visited.has(id)) return

      inStack.add(id)
      path.push(id)

      for (const dep of services[id].dependsOn) {
        visit(dep, [...path])
      }

      inStack.delete(id)
      visited.add(id)
    }

    for (const id of Object.keys(services)) {
      visit(id, [])
    }
  }
}

export const configLoader = new ConfigLoader()

import { readdir, readFile, writeFile, stat } from 'fs/promises'
import { join, relative, basename, dirname } from 'path'
import { homedir } from 'os'
import { appStore } from '../store'
import type { StandardsFile } from '@shared/planner-types'

const DEFAULT_DIR = join(homedir(), '.claude', 'commands', 'translate-to-jira')

export class StandardsManager {
  getStandardsDir(): string {
    return (appStore.get('standardsDir', null) as string | null) || DEFAULT_DIR
  }

  setStandardsDir(dir: string): void {
    appStore.set('standardsDir', dir)
  }

  async listFiles(): Promise<StandardsFile[]> {
    const baseDir = this.getStandardsDir()
    const files: StandardsFile[] = []

    try {
      await this.walkDir(baseDir, baseDir, files)
    } catch {
      // Directory may not exist yet
    }

    return files.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return a.name.localeCompare(b.name)
    })
  }

  private async walkDir(dir: string, baseDir: string, files: StandardsFile[]): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await this.walkDir(fullPath, baseDir, files)
      } else if (entry.name.endsWith('.md')) {
        const relPath = relative(baseDir, fullPath)
        const dirName = dirname(relPath)
        const category = dirName === '.' ? 'root' : dirName.split('/')[0]
        files.push({
          name: basename(entry.name),
          relativePath: relPath,
          category
        })
      }
    }
  }

  async readFile(relativePath: string): Promise<string> {
    const baseDir = this.getStandardsDir()
    const fullPath = join(baseDir, relativePath)
    // Prevent path traversal
    if (!fullPath.startsWith(baseDir)) {
      throw new Error('Invalid path')
    }
    return readFile(fullPath, 'utf-8')
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    const baseDir = this.getStandardsDir()
    const fullPath = join(baseDir, relativePath)
    if (!fullPath.startsWith(baseDir)) {
      throw new Error('Invalid path')
    }
    await writeFile(fullPath, content, 'utf-8')
  }

  async getSkillPrompt(): Promise<string> {
    const baseDir = this.getStandardsDir()
    const skillPath = join(baseDir, 'SKILL.md')
    return readFile(skillPath, 'utf-8')
  }

  async getAbsolutePaths(): Promise<string[]> {
    const files = await this.listFiles()
    const baseDir = this.getStandardsDir()
    return files.map((f) => join(baseDir, f.relativePath))
  }

  async dirExists(): Promise<boolean> {
    try {
      const s = await stat(this.getStandardsDir())
      return s.isDirectory()
    } catch {
      return false
    }
  }
}

export const standardsManager = new StandardsManager()

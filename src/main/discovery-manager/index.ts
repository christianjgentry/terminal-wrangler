import { readFile, writeFile, copyFile, mkdir, stat, unlink, rename } from 'fs/promises'
import { join, basename, resolve } from 'path'
import { randomUUID } from 'crypto'
import { createLogger } from '../lib/logger'
import type {
  AnyArtifact,
  FileArtifact,
  LinkArtifact,
  DiscoveryManifest,
  AddFileArtifactRequest,
  AddLinkArtifactRequest,
  DiscoveryContext
} from '@shared/discovery-types'

const log = createLogger('DiscoveryManager')

const MANIFEST_FILE = '.manifest.json'
const DEFAULT_MANIFEST: DiscoveryManifest = { version: 1, artifacts: [] }

function detectLinkType(url: string): LinkArtifact['linkType'] {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('figma.com')) return 'figma'
    if (host.includes('miro.com')) return 'miro'
    if (host.includes('docs.google.com')) return 'google-doc'
  } catch {
    // invalid URL
  }
  return 'other'
}

function detectMimeType(fileName: string): string | undefined {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    md: 'text/markdown',
    txt: 'text/plain',
    json: 'application/json',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    csv: 'text/csv'
  }
  return ext ? map[ext] : undefined
}

export class DiscoveryManager {
  private discoveryDir(projectPath: string): string {
    return join(projectPath, 'discovery')
  }

  private manifestPath(projectPath: string): string {
    return join(this.discoveryDir(projectPath), MANIFEST_FILE)
  }

  private ensafePath(projectPath: string, relativePath: string): string {
    const base = this.discoveryDir(projectPath)
    const full = resolve(base, relativePath)
    if (!full.startsWith(base)) {
      throw new Error('Invalid path')
    }
    return full
  }

  async exists(projectPath: string): Promise<boolean> {
    try {
      const s = await stat(this.discoveryDir(projectPath))
      return s.isDirectory()
    } catch {
      return false
    }
  }

  async initDiscoveryFolder(projectPath: string): Promise<void> {
    const dir = this.discoveryDir(projectPath)
    await mkdir(dir, { recursive: true })

    const manifest = this.manifestPath(projectPath)
    try {
      await stat(manifest)
    } catch {
      await this.writeManifest(projectPath, DEFAULT_MANIFEST)
    }

    const readmePath = join(dir, 'README.md')
    try {
      await stat(readmePath)
    } catch {
      await writeFile(
        readmePath,
        '# Discovery Artifacts\n\nThis folder contains call transcripts, meeting notes, and other discovery artifacts used to provide context to AI agents.\n\nManaged by Terminal Wrangler. Do not edit `.manifest.json` manually.\n',
        'utf-8'
      )
    }

    log.info('Initialized discovery folder:', dir)
  }

  async listArtifacts(projectPath: string): Promise<AnyArtifact[]> {
    const manifest = await this.readManifest(projectPath)
    return manifest.artifacts
  }

  async addFileArtifacts(
    projectPath: string,
    request: AddFileArtifactRequest
  ): Promise<AnyArtifact[]> {
    const manifest = await this.readManifest(projectPath)
    const added: AnyArtifact[] = []

    for (const sourcePath of request.sourcePaths) {
      const fileName = basename(sourcePath)
      const subfolder = request.subfolder?.replace(/^\/+|\/+$/g, '') || ''
      const relPath = subfolder ? `${subfolder}/${fileName}` : fileName
      const destPath = this.ensafePath(projectPath, relPath)

      // Ensure destination directory
      const destDir = join(destPath, '..')
      await mkdir(destDir, { recursive: true })

      await copyFile(sourcePath, destPath)

      let sizeBytes: number | undefined
      try {
        const s = await stat(destPath)
        sizeBytes = s.size
      } catch {
        // ignore
      }

      const artifact: FileArtifact = {
        id: randomUUID(),
        type: 'file',
        name: fileName,
        fileName,
        relativePath: relPath,
        mimeType: detectMimeType(fileName),
        sizeBytes,
        tags: request.tags,
        addedAt: Date.now()
      }

      manifest.artifacts.push(artifact)
      added.push(artifact)
    }

    await this.writeManifest(projectPath, manifest)
    log.info(`Added ${added.length} file artifact(s)`)
    return added
  }

  async addLink(
    projectPath: string,
    request: AddLinkArtifactRequest
  ): Promise<LinkArtifact> {
    const manifest = await this.readManifest(projectPath)

    const artifact: LinkArtifact = {
      id: randomUUID(),
      type: 'link',
      name: request.name,
      url: request.url,
      description: request.description,
      linkType: request.linkType || detectLinkType(request.url),
      tags: request.tags,
      addedAt: Date.now()
    }

    manifest.artifacts.push(artifact)
    await this.writeManifest(projectPath, manifest)
    log.info('Added link artifact:', artifact.name)
    return artifact
  }

  async removeArtifact(projectPath: string, id: string): Promise<void> {
    const manifest = await this.readManifest(projectPath)
    const artifact = manifest.artifacts.find((a) => a.id === id)
    if (!artifact) return

    if (artifact.type === 'file') {
      const fileArtifact = artifact as FileArtifact
      const filePath = this.ensafePath(projectPath, fileArtifact.relativePath)
      try {
        await unlink(filePath)
      } catch {
        log.warn('Could not delete file:', filePath)
      }
    }

    manifest.artifacts = manifest.artifacts.filter((a) => a.id !== id)
    await this.writeManifest(projectPath, manifest)
    log.info('Removed artifact:', id)
  }

  async buildContext(
    projectPath: string,
    artifactIds?: string[]
  ): Promise<DiscoveryContext> {
    const manifest = await this.readManifest(projectPath)
    let artifacts = manifest.artifacts

    if (artifactIds && artifactIds.length > 0) {
      const idSet = new Set(artifactIds)
      artifacts = artifacts.filter((a) => idSet.has(a.id))
    }

    const filePaths: string[] = []
    const linkLines: string[] = []

    for (const artifact of artifacts) {
      if (artifact.type === 'file') {
        const fileArtifact = artifact as FileArtifact
        const absPath = this.ensafePath(projectPath, fileArtifact.relativePath)
        filePaths.push(absPath)
      } else if (artifact.type === 'link') {
        const linkArtifact = artifact as LinkArtifact
        let line = `- [${linkArtifact.name}](${linkArtifact.url})`
        if (linkArtifact.description) {
          line += ` — ${linkArtifact.description}`
        }
        if (linkArtifact.linkType && linkArtifact.linkType !== 'other') {
          line += ` (${linkArtifact.linkType})`
        }
        linkLines.push(line)
      }
    }

    let linkPromptText = ''
    if (linkLines.length > 0) {
      linkPromptText =
        '\n\n## Discovery Links\n\nThe following external resources provide additional context. If MCP tools are available for these services (e.g., Figma, Miro), use them to fetch content.\n\n' +
        linkLines.join('\n')
    }

    return { filePaths, linkPromptText }
  }

  private async readManifest(projectPath: string): Promise<DiscoveryManifest> {
    try {
      const raw = await readFile(this.manifestPath(projectPath), 'utf-8')
      return JSON.parse(raw) as DiscoveryManifest
    } catch {
      return { ...DEFAULT_MANIFEST, artifacts: [] }
    }
  }

  private async writeManifest(
    projectPath: string,
    manifest: DiscoveryManifest
  ): Promise<void> {
    const manifestFile = this.manifestPath(projectPath)
    const tmpFile = manifestFile + '.tmp'
    await writeFile(tmpFile, JSON.stringify(manifest, null, 2), 'utf-8')
    await rename(tmpFile, manifestFile)
  }
}

export const discoveryManager = new DiscoveryManager()

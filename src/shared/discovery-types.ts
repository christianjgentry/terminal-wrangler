export type ArtifactType = 'file' | 'link'

export interface DiscoveryArtifact {
  id: string
  type: ArtifactType
  name: string
  description?: string
  tags?: string[]
  addedAt: number
}

export interface FileArtifact extends DiscoveryArtifact {
  type: 'file'
  fileName: string
  relativePath: string
  mimeType?: string
  sizeBytes?: number
}

export interface LinkArtifact extends DiscoveryArtifact {
  type: 'link'
  url: string
  linkType?: 'figma' | 'miro' | 'google-doc' | 'other'
}

export type AnyArtifact = FileArtifact | LinkArtifact

export interface DiscoveryManifest {
  version: 1
  artifacts: AnyArtifact[]
}

export interface AddFileArtifactRequest {
  sourcePaths: string[]
  subfolder?: string
  tags?: string[]
}

export interface AddLinkArtifactRequest {
  name: string
  url: string
  description?: string
  linkType?: LinkArtifact['linkType']
  tags?: string[]
}

export interface DiscoveryContext {
  filePaths: string[]
  linkPromptText: string
}

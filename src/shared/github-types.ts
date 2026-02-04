export interface PrInfo {
  number: number
  title: string
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  checksStatus: 'PASSING' | 'FAILING' | 'PENDING' | 'UNKNOWN'
  headRefName: string
  updatedAt: string
  lastFetchedAt: number
}

export interface GhAuthStatus {
  authenticated: boolean
  username: string | null
  scopes: string[]
  error: string | null
}

export interface GitRemoteInfo {
  owner: string
  repo: string
  fullName: string // "owner/repo"
  url: string
}

export interface GitHubProjectStatus {
  authStatus: GhAuthStatus | null
  remote: GitRemoteInfo | null
  ghAvailable: boolean
}

export interface MergeResult {
  success: boolean
  error?: string
}

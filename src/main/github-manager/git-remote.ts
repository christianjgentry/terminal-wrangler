import { execFile } from 'child_process'
import type { GitRemoteInfo } from '@shared/github-types'

export function detectGitRemote(cwd: string): Promise<GitRemoteInfo | null> {
  return new Promise((resolve) => {
    execFile('git', ['remote', 'get-url', 'origin'], { cwd, timeout: 5_000 }, (error, stdout) => {
      if (error || !stdout) {
        resolve(null)
        return
      }
      const url = stdout.trim()
      const info = parseRemoteUrl(url)
      resolve(info)
    })
  })
}

function parseRemoteUrl(url: string): GitRemoteInfo | null {
  // SSH: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?/)
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
      fullName: `${sshMatch[1]}/${sshMatch[2]}`,
      url
    }
  }

  // HTTPS: https://github.com/owner/repo.git
  const httpsMatch = url.match(/https?:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?/)
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2],
      fullName: `${httpsMatch[1]}/${httpsMatch[2]}`,
      url
    }
  }

  return null
}

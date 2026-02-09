import { execFile } from 'child_process'

export interface GhResult {
  stdout: string
  stderr: string
  exitCode: number
}

const GH_TIMEOUT = 15_000
const GIT_TIMEOUT = 30_000

export function ghExec(args: string[], cwd?: string): Promise<GhResult> {
  return new Promise((resolve) => {
    const child = execFile(
      'gh',
      args,
      { timeout: GH_TIMEOUT, cwd, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          exitCode: error ? (error as NodeJS.ErrnoException & { code?: number }).code === 'ETIMEDOUT' ? 124 : (child.exitCode ?? 1) : 0
        })
      }
    )
  })
}

export function gitExec(args: string[], cwd?: string): Promise<GhResult> {
  return new Promise((resolve) => {
    const child = execFile(
      'git',
      args,
      { timeout: GIT_TIMEOUT, cwd, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          exitCode: error ? (error as NodeJS.ErrnoException & { code?: number }).code === 'ETIMEDOUT' ? 124 : (child.exitCode ?? 1) : 0
        })
      }
    )
  })
}

export async function isGhAvailable(): Promise<boolean> {
  const result = await ghExec(['--version'])
  return result.exitCode === 0
}

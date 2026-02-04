import { execFile } from 'child_process'

export function createBranchFromMain(cwd: string, branchName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('git', ['fetch', 'origin', 'main'], { cwd, timeout: 15_000 }, (fetchErr, _stdout, fetchStderr) => {
      if (fetchErr) {
        reject(new Error(fetchStderr?.trim() || fetchErr.message))
        return
      }

      execFile(
        'git',
        ['checkout', '-b', branchName, 'origin/main'],
        { cwd, timeout: 10_000 },
        (checkoutErr, _out, checkoutStderr) => {
          if (checkoutErr) {
            reject(new Error(checkoutStderr?.trim() || checkoutErr.message))
            return
          }
          resolve()
        }
      )
    })
  })
}

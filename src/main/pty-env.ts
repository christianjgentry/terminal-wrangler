/**
 * Clean environment variables for child PTY processes.
 *
 * Electron and build tools (electron-vite, Vite) inject env vars into the
 * main process that can interfere with CLI tools spawned in child PTYs.
 * For example, NODE_OPTIONS flags meant for Electron can break the Claude
 * CLI's Node.js runtime, and ELECTRON_* vars leak implementation details.
 */

const ENV_STRIP_PREFIXES = [
  'ELECTRON_',
  'VITE_',
  'CHROME_CRASHPAD_PIPE_NAME'
]

const ENV_STRIP_EXACT = new Set([
  'NODE_OPTIONS',
  'GOOGLE_API_KEY',
  'NODE_CHANNEL_FD',
  'NODE_CHANNEL_SERIALIZATION_MODE',
  'ORIGINAL_XDG_CURRENT_DESKTOP'
])

export function cleanEnvForPty(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue
    if (ENV_STRIP_EXACT.has(key)) continue
    if (ENV_STRIP_PREFIXES.some((prefix) => key.startsWith(prefix))) continue
    env[key] = value
  }
  return env
}

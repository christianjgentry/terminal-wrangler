// Shared ANSI stripping and terminal output cleaning utilities.
// Used by both main process (status-detector) and renderer (AgentMiniTerminal).

// Comprehensive ANSI escape sequence regex based on ansi-regex@6.0.1.
// Handles: CSI (including DEC private modes like ?2026h), OSC, 8-bit CSI (0x9B),
// single-character escapes, and other common terminal sequences.
// eslint-disable-next-line no-control-regex
const ANSI_REGEX =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g

/**
 * Strip all ANSI escape sequences from text.
 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '')
}

/**
 * Simulate terminal carriage-return behavior.
 * When \r appears without a following \n, subsequent text overwrites from the
 * beginning of the current line — this is how spinners/progress bars work.
 * We resolve each line so only the final visible content remains.
 */
export function resolveCarriageReturns(text: string): string {
  const lines = text.split('\n')
  const resolved: string[] = []

  for (const line of lines) {
    if (!line.includes('\r')) {
      resolved.push(line)
      continue
    }

    // Split on \r and simulate overwrites
    const segments = line.split('\r')
    let current = ''
    for (const seg of segments) {
      if (seg.length === 0) continue
      // Overwrite from the start, keeping any trailing portion of `current`
      // that extends past the new segment
      if (seg.length >= current.length) {
        current = seg
      } else {
        current = seg + current.slice(seg.length)
      }
    }
    resolved.push(current)
  }

  return resolved.join('\n')
}

/**
 * Full cleaning pipeline: strip ANSI → resolve carriage returns → strip
 * residual control characters (except newline/tab).
 */
export function cleanTerminalOutput(text: string): string {
  let cleaned = stripAnsi(text)
  cleaned = resolveCarriageReturns(cleaned)
  // Strip any remaining control chars except \n and \t
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  return cleaned
}

import type { ITheme, ITerminalOptions } from '@xterm/xterm'

export const TERMINAL_THEME: ITheme = {
  background: '#141420',
  foreground: '#e4e4e9',
  cursor: '#7c3aed',
  selectionBackground: '#7c3aed44',
  black: '#1e1e2e',
  red: '#ef4444',
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  magenta: '#a855f7',
  cyan: '#06b6d4',
  white: '#e4e4e9',
  brightBlack: '#6b7280',
  brightRed: '#f87171',
  brightGreen: '#34d399',
  brightYellow: '#fbbf24',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff'
}

export const TERMINAL_OPTIONS: ITerminalOptions = {
  theme: TERMINAL_THEME,
  fontSize: 12,
  fontFamily: 'SF Mono, Menlo, Monaco, Courier New, monospace',
  cursorBlink: true,
  scrollback: 5000,
  convertEol: true
}

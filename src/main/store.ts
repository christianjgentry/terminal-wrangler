import Store from 'electron-store'
import type { AppSettings } from '@shared/types'

const defaults: AppSettings = {
  recentProjects: [],
  windowBounds: undefined,
  terminalPanelHeight: 300,
  sidebarWidth: 320,
  docsPanelWidth: 320
}

export const appStore = new Store<AppSettings>({
  name: 'terminal-wrangler-settings',
  defaults
})

import { useEffect } from 'react'
import { useAppStore } from '../stores/app-store'

export function useKeyboardShortcuts(): void {
  const setTerminalPanelOpen = useAppStore((s) => s.setTerminalPanelOpen)
  const terminalPanelOpen = useAppStore((s) => s.terminalPanelOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setDocsPanelOpen = useAppStore((s) => s.setDocsPanelOpen)
  const docsPanelOpen = useAppStore((s) => s.docsPanelOpen)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const settingsModalOpen = useAppStore((s) => s.settingsModalOpen)
  const setSettingsModalOpen = useAppStore((s) => s.setSettingsModalOpen)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const isMeta = e.metaKey || e.ctrlKey

      // Cmd+, — toggle settings modal
      if (isMeta && e.key === ',') {
        e.preventDefault()
        setSettingsModalOpen(!settingsModalOpen)
        return
      }

      // Cmd+` — toggle terminal panel
      if (isMeta && e.key === '`') {
        e.preventDefault()
        setTerminalPanelOpen(!terminalPanelOpen)
      }

      // Cmd+B — toggle sidebar
      if (isMeta && e.key === 'b') {
        e.preventDefault()
        setSidebarOpen(!sidebarOpen)
      }

      // Cmd+D — toggle docs panel
      if (isMeta && e.key === 'd') {
        e.preventDefault()
        setDocsPanelOpen(!docsPanelOpen)
      }

      // Cmd+1 — Services view
      if (isMeta && e.key === '1') {
        e.preventDefault()
        setActiveView('services')
      }

      // Cmd+2 — Agents view
      if (isMeta && e.key === '2') {
        e.preventDefault()
        setActiveView('agents')
      }

      // Cmd+3 — Jira view
      if (isMeta && e.key === '3') {
        e.preventDefault()
        setActiveView('jira')
      }

      // Escape — close sidebar
      if (e.key === 'Escape') {
        if (sidebarOpen) {
          setSidebarOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [terminalPanelOpen, sidebarOpen, docsPanelOpen, settingsModalOpen, setTerminalPanelOpen, setSidebarOpen, setDocsPanelOpen, setActiveView, setSettingsModalOpen])
}

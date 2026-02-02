import { useEffect } from 'react'
import { useAppStore } from '../stores/app-store'

export function useKeyboardShortcuts(): void {
  const setTerminalPanelOpen = useAppStore((s) => s.setTerminalPanelOpen)
  const terminalPanelOpen = useAppStore((s) => s.terminalPanelOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const isMeta = e.metaKey || e.ctrlKey

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

      // Escape — close sidebar
      if (e.key === 'Escape') {
        if (sidebarOpen) {
          setSidebarOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [terminalPanelOpen, sidebarOpen, setTerminalPanelOpen, setSidebarOpen])
}

import { useCallback, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useSettingsStore } from '../../stores/settings-store'
import { AuthenticationSection } from './AuthenticationSection'

const SECTIONS = [
  { id: 'authentication', label: 'Authentication' }
] as const

export function SettingsModal(): JSX.Element | null {
  const open = useAppStore((s) => s.settingsModalOpen)
  const setOpen = useAppStore((s) => s.setSettingsModalOpen)
  const activeSection = useAppStore((s) => s.settingsSection)
  const setActiveSection = useAppStore((s) => s.setSettingsSection)
  const fetchAllAuthStatus = useSettingsStore((s) => s.fetchAllAuthStatus)

  useEffect(() => {
    if (open) {
      fetchAllAuthStatus()
    }
  }, [open, fetchAllAuthStatus])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        setOpen(false)
      }
    },
    [setOpen]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    },
    [setOpen]
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-surface-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-44 shrink-0 bg-surface-800/50 border-r border-white/5 p-3">
          <h3 className="text-[10px] font-medium text-surface-500 uppercase tracking-wider px-2 mb-2">
            Settings
          </h3>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                activeSection === section.id
                  ? 'text-white bg-surface-700'
                  : 'text-surface-400 hover:text-surface-300 hover:bg-surface-700/50'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'authentication' && <AuthenticationSection />}
        </div>
      </div>
    </div>
  )
}

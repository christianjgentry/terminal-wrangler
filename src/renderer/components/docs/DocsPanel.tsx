import { useCallback, useRef, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useDocsStore } from '../../stores/docs-store'
import { ServiceDocs } from './ServiceDocs'
import { ScriptList } from './ScriptList'
import { RandomNameGenerator } from './RandomNameGenerator'

export function DocsPanel(): JSX.Element | null {
  const docsPanelOpen = useAppStore((s) => s.docsPanelOpen)
  const docsPanelWidth = useAppStore((s) => s.docsPanelWidth)
  const setDocsPanelWidth = useAppStore((s) => s.setDocsPanelWidth)
  const setDocsPanelOpen = useAppStore((s) => s.setDocsPanelOpen)
  const projectPath = useAppStore((s) => s.projectPath)

  const docsData = useDocsStore((s) => s.docsData)
  const isLoading = useDocsStore((s) => s.isLoading)
  const error = useDocsStore((s) => s.error)
  const activeContentTab = useDocsStore((s) => s.activeContentTab)
  const setActiveContentTab = useDocsStore((s) => s.setActiveContentTab)
  const activeEnvironmentTab = useDocsStore((s) => s.activeEnvironmentTab)
  const setActiveEnvironmentTab = useDocsStore((s) => s.setActiveEnvironmentTab)

  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(docsPanelWidth)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true
      startX.current = e.clientX
      startWidth.current = docsPanelWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [docsPanelWidth]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      const newWidth = Math.max(240, Math.min(600, startWidth.current + delta))
      setDocsPanelWidth(newWidth)
    }

    const handleMouseUp = (): void => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        // Persist width
        window.api.saveSettings({ docsPanelWidth: useAppStore.getState().docsPanelWidth })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [setDocsPanelWidth])

  if (!docsPanelOpen) return null

  const hasReadme = docsData?.readme != null
  const hasScripts = docsData != null && docsData.scripts.length > 0
  const filteredScripts =
    docsData?.scripts.filter((s) => s.environment === activeEnvironmentTab) ?? []

  return (
    <div
      className="bg-surface-900 border-r border-white/5 flex flex-col shrink-0 relative"
      style={{ width: docsPanelWidth }}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-8 px-3 border-b border-white/5 shrink-0">
        <span className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
          Project Docs
        </span>
        <button
          onClick={() => setDocsPanelOpen(false)}
          className="text-surface-400 hover:text-white transition-colors text-sm leading-none px-1"
        >
          &times;
        </button>
      </div>

      {/* Random Name Generator Section */}
      <RandomNameGenerator />

      {/* Content tabs */}
      {docsData && (hasReadme || hasScripts) && (
        <div className="flex items-center h-7 border-b border-white/5 shrink-0 px-2 gap-1">
          {hasReadme && (
            <button
              onClick={() => setActiveContentTab('readme')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                activeContentTab === 'readme'
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              README
            </button>
          )}
          {hasScripts && (
            <button
              onClick={() => setActiveContentTab('scripts')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                activeContentTab === 'scripts'
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              Scripts
            </button>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-surface-500 text-xs">
            Loading docs...
          </div>
        )}

        {error && (
          <div className="px-3 py-3 text-red-400 text-xs">{error}</div>
        )}

        {!isLoading && !error && !docsData && (
          <div className="flex items-center justify-center py-8 text-surface-500 text-xs">
            No project loaded
          </div>
        )}

        {!isLoading && docsData && activeContentTab === 'readme' && hasReadme && (
          <div className="p-3">
            <ServiceDocs markdown={docsData.readme!} />
          </div>
        )}

        {!isLoading && docsData && activeContentTab === 'scripts' && hasScripts && (
          <div>
            {/* Environment sub-tabs */}
            {docsData.environments.length > 1 && (
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5 overflow-x-auto">
                {docsData.environments.map((env) => (
                  <button
                    key={env}
                    onClick={() => setActiveEnvironmentTab(env)}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors shrink-0 capitalize ${
                      activeEnvironmentTab === env
                        ? 'bg-accent/20 text-accent-light'
                        : 'text-surface-400 hover:text-white hover:bg-surface-800'
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>
            )}

            <ScriptList scripts={filteredScripts} projectPath={projectPath!} />
          </div>
        )}

        {!isLoading && docsData && !hasReadme && !hasScripts && (
          <div className="flex items-center justify-center py-8 text-surface-500 text-xs">
            No README or scripts detected
          </div>
        )}
      </div>

      {/* Resize handle (right edge) */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/40 transition-colors"
      />
    </div>
  )
}

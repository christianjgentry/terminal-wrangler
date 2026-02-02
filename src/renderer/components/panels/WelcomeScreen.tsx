import { useState, useCallback } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useServiceStore } from '../../stores/service-store'
import { useDocsStore } from '../../stores/docs-store'
import { ConfigPreviewModal } from './ConfigPreviewModal'
import type { ServiceConfig } from '@shared/types'
import logoBlack from '../../assets/logo-black.svg'
import logoWhite from '../../assets/logo-white.svg'

export function WelcomeScreen(): JSX.Element {
  const setProjectPath = useAppStore((s) => s.setProjectPath)
  const setProjectName = useAppStore((s) => s.setProjectName)
  const setConfigError = useAppStore((s) => s.setConfigError)
  const configError = useAppStore((s) => s.configError)
  const recentProjects = useAppStore((s) => s.recentProjects)
  const setServices = useServiceStore((s) => s.setServices)
  const setDocsPanelOpen = useAppStore((s) => s.setDocsPanelOpen)
  const setDocsData = useDocsStore((s) => s.setDocsData)
  const setDocsLoading = useDocsStore((s) => s.setLoading)
  const clearDocs = useDocsStore((s) => s.clearDocs)

  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [previewYaml, setPreviewYaml] = useState<string | null>(null)

  const loadProject = useCallback(
    async (path: string): Promise<void> => {
      try {
        setConfigError(null)
        setPendingProjectPath(null)
        clearDocs()
        const result = (await window.api.loadConfig(path)) as {
          project: { name: string; description?: string }
          services: Record<string, ServiceConfig>
        }
        setProjectPath(path)
        setProjectName(result.project.name)
        setServices(result.services)

        // Fetch docs data and open panel
        setDocsLoading(true)
        setDocsPanelOpen(true)
        try {
          const docsData = await window.api.getProjectDocs(path)
          setDocsData(docsData)
        } catch {
          // Non-fatal: docs panel just shows empty state
        } finally {
          setDocsLoading(false)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setConfigError(message)
        if (message.includes('.terminal-wrangler.yml')) {
          setPendingProjectPath(path)
        }
      }
    },
    [setConfigError, setProjectPath, setProjectName, setServices, setDocsPanelOpen, setDocsData, setDocsLoading, clearDocs]
  )

  const handleOpen = async (): Promise<void> => {
    const path = await window.api.openProject()
    if (!path) return
    await loadProject(path)
  }

  const handleGenerate = async (): Promise<void> => {
    if (!pendingProjectPath) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const result = await window.api.generateConfig(pendingProjectPath)
      const services = (result.config as { services?: Record<string, unknown> })?.services
      if (!result.yaml || result.yaml.trim() === '' || !services || Object.keys(services).length === 0) {
        setGenerateError(
          'No services detected. The project may not have recognizable service definitions (package.json scripts, docker-compose, Makefile, etc.).'
        )
        return
      }
      setPreviewYaml(result.yaml)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveAndLoad = async (yamlContent: string): Promise<void> => {
    if (!pendingProjectPath) return
    try {
      await window.api.saveGeneratedConfig(pendingProjectPath, yamlContent)
      setPreviewYaml(null)
      await loadProject(pendingProjectPath)
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleCancelPreview = (): void => {
    setPreviewYaml(null)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8">
      <div className="drag-region absolute top-0 left-0 right-0 h-10" />

      <div className="flex flex-col items-center gap-4">
        <img src={logoBlack} alt="Terminal Wrangler" className="w-48 h-48 object-contain dark:hidden" />
        <img src={logoWhite} alt="Terminal Wrangler" className="w-48 h-48 object-contain hidden dark:block" />
        <p className="text-surface-400 text-sm">
          Visualize and manage your project&apos;s terminal services
        </p>
      </div>

      <button
        onClick={handleOpen}
        className="no-drag px-6 py-3 bg-accent hover:bg-accent-dark text-white rounded-lg font-medium transition-colors"
      >
        Open Project
      </button>

      {(configError || generateError) && (
        <div className="max-w-md px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {configError}
          {generateError && <p className="mt-2">{generateError}</p>}
          {pendingProjectPath && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="no-drag mt-3 w-full px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent-light border border-accent/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {generating ? 'Scanning project...' : 'Generate Config'}
            </button>
          )}
        </div>
      )}

      {recentProjects.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <h3 className="text-surface-400 text-xs uppercase tracking-wider font-medium">
            Recent Projects
          </h3>
          {recentProjects.map((project) => (
            <button
              key={project.path}
              onClick={() => loadProject(project.path)}
              className="no-drag text-left px-4 py-2 rounded-lg hover:bg-surface-800 transition-colors"
            >
              <div className="text-sm text-white">{project.name}</div>
              <div className="text-xs text-surface-500 truncate max-w-xs">{project.path}</div>
            </button>
          ))}
        </div>
      )}

      {previewYaml && pendingProjectPath && (
        <ConfigPreviewModal
          yaml={previewYaml}
          projectPath={pendingProjectPath}
          onSave={handleSaveAndLoad}
          onCancel={handleCancelPreview}
        />
      )}
    </div>
  )
}

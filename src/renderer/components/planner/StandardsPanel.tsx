import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { usePlannerStore } from '../../stores/planner-store'
import type { StandardsFile } from '@shared/planner-types'

export function StandardsPanel(): JSX.Element {
  const standardsFiles = usePlannerStore((s) => s.standardsFiles)
  const selectedFile = usePlannerStore((s) => s.selectedFile)
  const fileContent = usePlannerStore((s) => s.fileContent)
  const editMode = usePlannerStore((s) => s.editMode)
  const editBuffer = usePlannerStore((s) => s.editBuffer)
  const loading = usePlannerStore((s) => s.loading)
  const saving = usePlannerStore((s) => s.saving)
  const selectFile = usePlannerStore((s) => s.selectFile)
  const clearSelectedFile = usePlannerStore((s) => s.clearSelectedFile)
  const setEditMode = usePlannerStore((s) => s.setEditMode)
  const setEditBuffer = usePlannerStore((s) => s.setEditBuffer)
  const saveFile = usePlannerStore((s) => s.saveFile)
  const setDirDialogOpen = usePlannerStore((s) => s.setDirDialogOpen)

  // Group files by category
  const grouped = standardsFiles.reduce<Record<string, StandardsFile[]>>((acc, file) => {
    const cat = file.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(file)
    return acc
  }, {})

  const categoryOrder = ['root', ...Object.keys(grouped).filter((k) => k !== 'root').sort()]

  return (
    <div className="w-[280px] shrink-0 border-r border-white/5 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
          Standards
        </span>
        <button
          onClick={() => setDirDialogOpen(true)}
          className="text-surface-500 hover:text-surface-300 transition-colors"
          title="Change standards directory"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z" />
          </svg>
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {standardsFiles.length === 0 && !loading && (
          <div className="px-3 py-4 text-xs text-surface-500 text-center">
            No .md files found.
            <br />
            <button
              onClick={() => setDirDialogOpen(true)}
              className="text-accent-light hover:text-accent mt-1 underline"
            >
              Configure directory
            </button>
          </div>
        )}

        {categoryOrder.map((cat) => {
          const files = grouped[cat]
          if (!files) return null
          return (
            <div key={cat}>
              {cat !== 'root' && (
                <div className="px-3 pt-3 pb-1 text-[9px] font-medium text-surface-500 uppercase tracking-wider">
                  {cat}
                </div>
              )}
              {files.map((file) => (
                <button
                  key={file.relativePath}
                  onClick={() => selectFile(file.relativePath)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors truncate ${
                    selectedFile === file.relativePath
                      ? 'text-white bg-surface-700'
                      : 'text-surface-400 hover:text-surface-300 hover:bg-surface-800'
                  }`}
                  title={file.relativePath}
                >
                  {file.name}
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {/* File content viewer / editor */}
      {selectedFile && (
        <div className="border-t border-white/5 flex flex-col" style={{ height: '50%' }}>
          {/* Content header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={clearSelectedFile}
                className="text-surface-500 hover:text-white text-xs shrink-0"
              >
                &times;
              </button>
              <span className="text-[10px] text-surface-400 truncate">
                {selectedFile}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {editMode && (
                <button
                  onClick={saveFile}
                  disabled={saving}
                  className="text-[10px] text-accent-light hover:text-white px-1.5 py-0.5 rounded hover:bg-surface-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
              <button
                onClick={() => setEditMode(!editMode)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  editMode
                    ? 'text-accent-light bg-accent/10'
                    : 'text-surface-400 hover:text-surface-300 hover:bg-surface-700'
                }`}
              >
                {editMode ? 'View' : 'Edit'}
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-surface-500 text-xs">
                Loading...
              </div>
            ) : editMode ? (
              <textarea
                value={editBuffer}
                onChange={(e) => setEditBuffer(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-none resize-none px-3 py-2 text-[11px] text-surface-300 font-mono"
              />
            ) : (
              <div className="px-3 py-2 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xs font-bold text-white mb-1.5">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-[11px] font-semibold text-white mb-1 mt-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-[11px] font-semibold text-surface-200 mb-1 mt-1.5">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-[11px] text-surface-400 mb-1.5 leading-relaxed">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-white font-semibold">{children}</strong>
                    ),
                    code: ({ children, className }) => {
                      const isBlock = className?.includes('language-')
                      if (isBlock) {
                        return (
                          <pre className="bg-surface-950 rounded p-2 text-[10px] font-mono text-surface-300 overflow-x-auto my-1.5">
                            <code>{children}</code>
                          </pre>
                        )
                      }
                      return (
                        <code className="px-1 py-0.5 bg-surface-950 text-accent-light rounded text-[10px] font-mono">
                          {children}
                        </code>
                      )
                    },
                    ul: ({ children }) => (
                      <ul className="text-[11px] text-surface-400 space-y-0.5 mb-1.5 ml-3 list-disc">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="text-[11px] text-surface-400 space-y-0.5 mb-1.5 ml-3 list-decimal">{children}</ol>
                    ),
                    li: ({ children }) => <li className="text-[11px] text-surface-400">{children}</li>,
                    a: ({ children, href }) => (
                      <a href={href} className="text-accent-light hover:text-accent underline" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    )
                  }}
                >
                  {fileContent || ''}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

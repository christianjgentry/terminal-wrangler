import { useState } from 'react'

interface ConfigPreviewModalProps {
  yaml: string
  projectPath: string
  onSave: (yaml: string) => void
  onCancel: () => void
}

export function ConfigPreviewModal({
  yaml: initialYaml,
  projectPath,
  onSave,
  onCancel
}: ConfigPreviewModalProps): JSX.Element {
  const [yaml, setYaml] = useState(initialYaml)
  const [saving, setSaving] = useState(false)

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    onSave(yaml)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700">
          <h2 className="text-lg font-semibold text-white">Generated Configuration</h2>
          <p className="text-xs text-surface-400 mt-1 truncate">{projectPath}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden px-6 py-4">
          <textarea
            value={yaml}
            onChange={(e) => setYaml(e.target.value)}
            spellCheck={false}
            className="w-full h-full min-h-[300px] bg-surface-950 text-surface-200 font-mono text-sm p-4 rounded-lg border border-surface-700 focus:border-accent focus:outline-none resize-none"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm text-surface-300 hover:text-white rounded-lg hover:bg-surface-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-accent hover:bg-accent-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Load Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

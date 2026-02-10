import { useState, useCallback } from 'react'
import { generateRandomName } from '../../lib/name-generator'

export function RandomNameGenerator(): JSX.Element {
  const [name, setName] = useState(() => generateRandomName())
  const [copied, setCopied] = useState(false)

  const handleRegenerate = useCallback(() => {
    setName(generateRandomName())
    setCopied(false)
  }, [])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(name)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [name])

  return (
    <div className="px-3 py-2 border-b border-white/5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
          Random Name
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-mono text-white truncate">
          {name}
        </span>
        <button
          onClick={handleCopy}
          className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded transition-colors text-accent-light bg-accent/10 hover:bg-accent/20"
          title="Copy to clipboard"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleRegenerate}
          className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded transition-colors text-surface-400 hover:text-white hover:bg-surface-800"
          title="Generate new name"
        >
          New
        </button>
      </div>
    </div>
  )
}

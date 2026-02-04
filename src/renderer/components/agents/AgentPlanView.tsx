import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AgentPlanViewProps {
  agentId: string
}

export function AgentPlanView({ agentId }: AgentPlanViewProps): JSX.Element {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setContent(null)
    window.api.getAgentPlanContent(agentId).then((result) => {
      if (cancelled) return
      if (result === null) {
        setError('Failed to read plan file')
      } else {
        setContent(result)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [agentId])

  const handleSave = (): void => {
    window.api.saveAgentPlan(agentId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-surface-400 text-xs">
        Loading plan...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-xs">
        {error}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end px-3 py-1.5 border-b border-white/5 shrink-0">
        <button
          onClick={handleSave}
          className="text-[10px] text-accent-light hover:text-white px-2 py-0.5 rounded hover:bg-surface-700 transition-colors"
        >
          Save as...
        </button>
      </div>
      <div className="flex-1 overflow-auto px-4 py-3">
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-base font-bold text-white mb-2">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-sm font-semibold text-white mb-1.5 mt-3">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xs font-semibold text-white mb-1 mt-2">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-xs text-surface-300 mb-2 leading-relaxed">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="text-white font-semibold">{children}</strong>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes('language-')
                if (isBlock) {
                  return (
                    <pre className="bg-surface-950 rounded-lg p-3 text-[11px] font-mono text-surface-300 overflow-x-auto my-2">
                      <code>{children}</code>
                    </pre>
                  )
                }
                return (
                  <code className="px-1 py-0.5 bg-surface-950 text-accent-light rounded text-[11px] font-mono">
                    {children}
                  </code>
                )
              },
              ul: ({ children }) => (
                <ul className="text-xs text-surface-300 space-y-1 mb-2 ml-4 list-disc">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="text-xs text-surface-300 space-y-1 mb-2 ml-4 list-decimal">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="text-xs text-surface-300">{children}</li>,
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="text-accent-light hover:text-accent underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <table className="text-xs border-collapse border border-white/10 my-2 w-full">
                  {children}
                </table>
              ),
              th: ({ children }) => (
                <th className="border border-white/10 px-2 py-1 bg-surface-800 text-left font-medium text-surface-300">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-white/10 px-2 py-1 text-surface-400">{children}</td>
              )
            }}
          >
            {content!}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

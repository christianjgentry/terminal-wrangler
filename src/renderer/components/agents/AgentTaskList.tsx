import type { AgentTask } from '@shared/agent-types'

interface AgentTaskListProps {
  tasks: AgentTask[]
}

function TaskIcon({ status }: { status: AgentTask['status'] }): JSX.Element {
  if (status === 'completed') {
    return (
      <svg className="w-3 h-3 text-green-400 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L7 8.94 5.28 7.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z" />
      </svg>
    )
  }
  if (status === 'in_progress') {
    return (
      <span className="flex-shrink-0 w-3 h-3 flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
      </span>
    )
  }
  return (
    <span className="flex-shrink-0 w-3 h-3 flex items-center justify-center">
      <span className="w-2 h-2 rounded-full border border-surface-500" />
    </span>
  )
}

export function AgentTaskList({ tasks }: AgentTaskListProps): JSX.Element {
  if (tasks.length === 0) {
    return (
      <div className="bg-surface-950 rounded px-2 py-1.5 h-[68px] flex items-center justify-center">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-surface-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-surface-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-surface-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-950 rounded px-2 py-1.5 h-[68px] overflow-y-auto space-y-0.5">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-1.5 min-w-0">
          <TaskIcon status={task.status} />
          <span
            className={`text-[10px] truncate ${
              task.status === 'completed'
                ? 'text-surface-500 line-through'
                : task.status === 'in_progress'
                  ? 'text-blue-300'
                  : 'text-surface-400'
            }`}
          >
            {task.status === 'in_progress' && task.activeForm
              ? task.activeForm
              : task.subject}
          </span>
        </div>
      ))}
    </div>
  )
}

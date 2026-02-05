import { useNotificationStore, type Notification } from '../../stores/notification-store'
import { useAppStore } from '../../stores/app-store'

function NotificationItem({ notification, onDismiss, onClick }: {
  notification: Notification
  onDismiss: () => void
  onClick: () => void
}): JSX.Element {
  return (
    <div
      className="bg-surface-800 border border-accent-500/50 rounded-lg shadow-lg p-3 mb-2 max-w-sm animate-slide-in cursor-pointer hover:bg-surface-700 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-amber-400">Input Needed</span>
          </div>
          <p className="text-sm font-medium text-white truncate">{notification.agentName}</p>
          <p className="text-xs text-surface-300 line-clamp-2">{notification.prompt}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="text-surface-400 hover:text-white p-1 -m-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-surface-500 mt-1">Click to go to terminal</p>
    </div>
  )
}

export function NotificationToast(): JSX.Element | null {
  const notifications = useNotificationStore((s) => s.notifications)
  const removeNotification = useNotificationStore((s) => s.removeNotification)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const setActiveAgentTerminalTab = useAppStore((s) => s.setActiveAgentTerminalTab)

  if (notifications.length === 0) return null

  const handleClick = (notification: Notification): void => {
    // Switch to agents view and focus the terminal
    setActiveView('agents')
    setActiveAgentTerminalTab(notification.agentId)
    removeNotification(notification.id)
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
          onClick={() => handleClick(notification)}
        />
      ))}
    </div>
  )
}

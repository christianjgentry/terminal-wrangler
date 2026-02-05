import { create } from 'zustand'

export interface Notification {
  id: string
  agentId: string
  agentName: string
  prompt: string
  createdAt: number
}

interface NotificationState {
  notifications: Notification[]
  addNotification: (agentId: string, agentName: string, prompt: string) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (agentId, agentName, prompt) => {
    const id = `${agentId}-${Date.now()}`
    const notification: Notification = {
      id,
      agentId,
      agentName,
      prompt,
      createdAt: Date.now()
    }

    set((state) => ({
      notifications: [...state.notifications, notification]
    }))

    // Auto-remove after 10 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      }))
    }, 10000)
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }))
  },

  clearAll: () => {
    set({ notifications: [] })
  }
}))

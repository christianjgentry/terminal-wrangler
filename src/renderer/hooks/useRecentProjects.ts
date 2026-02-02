import { useEffect } from 'react'
import { useAppStore } from '../stores/app-store'

export function useRecentProjects(): void {
  const setRecentProjects = useAppStore((s) => s.setRecentProjects)

  useEffect(() => {
    window.api
      .getRecentProjects()
      .then((projects) => {
        setRecentProjects(projects)
      })
      .catch(() => {
        // Ignore errors loading recent projects
      })
  }, [setRecentProjects])
}

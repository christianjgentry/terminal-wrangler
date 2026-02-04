import { useEffect } from 'react'
import { useSessionUsageStore } from '../stores/session-usage-store'

export function useSessionUsageListener(): void {
  const setUsage = useSessionUsageStore((s) => s.setUsage)
  const fetchUsage = useSessionUsageStore((s) => s.fetchUsage)

  useEffect(() => {
    fetchUsage()

    const unsub = window.api.onSessionUsageChanged((data) => {
      setUsage(data)
    })

    return unsub
  }, [setUsage, fetchUsage])
}

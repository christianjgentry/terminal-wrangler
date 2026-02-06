import { useEffect } from 'react'
import { usePlannerStore } from '../../stores/planner-store'
import { StandardsPanel } from './StandardsPanel'
import { FeatureInputPanel } from './FeatureInputPanel'
import { StandardsDirDialog } from './StandardsDirDialog'

export function PlannerView(): JSX.Element {
  const fetchStandardsDir = usePlannerStore((s) => s.fetchStandardsDir)
  const fetchFiles = usePlannerStore((s) => s.fetchFiles)
  const dirDialogOpen = usePlannerStore((s) => s.dirDialogOpen)

  useEffect(() => {
    fetchStandardsDir()
    fetchFiles()
  }, [fetchStandardsDir, fetchFiles])

  return (
    <>
      <div className="flex-1 flex overflow-hidden">
        <StandardsPanel />
        <FeatureInputPanel />
      </div>
      {dirDialogOpen && <StandardsDirDialog />}
    </>
  )
}

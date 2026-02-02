import { useAppStore } from './stores/app-store'
import { useIpcListeners } from './hooks/useIpcListeners'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useRecentProjects } from './hooks/useRecentProjects'
import { WelcomeScreen } from './components/panels/WelcomeScreen'
import { ProjectView } from './components/panels/ProjectView'

export default function App(): JSX.Element {
  const projectPath = useAppStore((s) => s.projectPath)

  useIpcListeners()
  useKeyboardShortcuts()
  useRecentProjects()

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-950 text-white">
      {projectPath ? <ProjectView /> : <WelcomeScreen />}
    </div>
  )
}

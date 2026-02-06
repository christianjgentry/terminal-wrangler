import { createRendererLogger } from './logger'

const logger = createRendererLogger('Global')

export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    logger.error('Uncaught error:', event.error?.stack || event.message)
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection:', event.reason)
  })
}

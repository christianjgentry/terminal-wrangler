import type { ElectronAPI } from '../../preload/index'

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

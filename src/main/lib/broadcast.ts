import { BrowserWindow } from 'electron'
import type { IpcPayloadMap } from '@shared/ipc-channels'

export function broadcast<C extends keyof IpcPayloadMap>(channel: C, data: IpcPayloadMap[C]): void
export function broadcast(channel: string, data: unknown): void
export function broadcast(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }
}

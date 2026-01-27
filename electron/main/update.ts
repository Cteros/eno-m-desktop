import { ipcMain, app, BrowserWindow, shell } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

// 配置 autoUpdater
if (!app.isPackaged) {
  autoUpdater.forceDevUpdateConfig = true
}
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

let currentUpdateInfo: any = null
let downloadedDmgPath: string | null = null

export function setupUpdateHandlers() {
  ipcMain.handle('check-for-updates', async () => {
    try {
      // 检查更新，但不自动下载
      const result = await autoUpdater.checkForUpdates()

      if (!result) {
        return {
          success: true,
          updateAvailable: false,
          currentVersion: `v${app.getVersion()}`,
          latestVersion: `v${app.getVersion()}`,
          releaseNotes: ''
        }
      }

      currentUpdateInfo = result.updateInfo
      const { updateInfo } = result
      const currentVersion = `v${app.getVersion()}`
      const latestVersion = `v${updateInfo.version}`

      // 比较版本
      const updateAvailable = updateInfo.version !== app.getVersion()

      return {
        success: true,
        updateAvailable: updateAvailable,
        currentVersion,
        latestVersion,
        releaseNotes: typeof updateInfo.releaseNotes === 'string'
          ? updateInfo.releaseNotes
          : (Array.isArray(updateInfo.releaseNotes)
            ? updateInfo.releaseNotes.map((n: any) => n.note).join('\n')
            : ''),
        downloadUrl: `https://github.com/cloudflypeng/eno-m-desktop/releases/tag/v${updateInfo.version}`
      }
    } catch (error: any) {
      console.error('Check for updates error:', error)
      return {
        success: false,
        updateAvailable: false,
        error: error.message,
        currentVersion: `v${app.getVersion()}`,
      }
    }
  })

  // 下载并安装更新
  ipcMain.handle('download-and-install-update', async () => {
    // macOS 上由于签名限制，手动接管下载和安装流程
    // 开始下载
    await autoUpdater.downloadUpdate()
    return { success: true, message: '开始下载更新' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// 获取应用版本
ipcMain.handle('get-app-version', () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
  }
})

// ... (listeners 保持不变) ...

// 退出并安装
ipcMain.handle('quit-and-install', () => {
  if (process.platform === 'darwin' && downloadedDmgPath) {
    shell.openPath(downloadedDmgPath)
    setTimeout(() => {
      app.quit()
    }, 1000)
  } else {
    autoUpdater.quitAndInstall()
  }
})

autoUpdater.on('error', (error) => {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('update-error', error.message)
  })
})
}
autoUpdater.quitAndInstall()

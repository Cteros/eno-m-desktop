import { ipcMain, app, BrowserWindow, shell } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

// 配置 autoUpdater
if (!app.isPackaged) {
  autoUpdater.forceDevUpdateConfig = true
}
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

export function setupUpdateHandlers() {
  // 检查更新
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
    try {
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

  // 监听事件并发送给前端
  autoUpdater.on('download-progress', (progressObj) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-download-progress', progressObj)
    })
  })

  autoUpdater.on('update-downloaded', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-downloaded')
    })
  })

  // 退出并安装
  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall()
  })

  autoUpdater.on('error', (error) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-error', error.message)
    })
  })
}

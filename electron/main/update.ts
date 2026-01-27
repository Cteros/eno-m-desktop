import { ipcMain, app, BrowserWindow, shell } from 'electron'
import electronUpdater from 'electron-updater'
import fs from 'node:fs'
import path from 'node:path'
import fetch from 'node-fetch'
import { spawn } from 'node:child_process'

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
    // macOS 上由于自签名证书限制，原生的差量更新校验由于签名不符会必然失败。
    // 为了实现"不跳转浏览器"的无感体验，这里改为手动下载完整 DMG 包并自动打开。
    // 虽然不是差量更新，但对用户来说体验是一致的（应用内下载 -> 重启安装）。
    if (process.platform === 'darwin') {
      try {
        if (!currentUpdateInfo) {
          const result = await autoUpdater.checkForUpdates()
          if (result) currentUpdateInfo = result.updateInfo
        }

        if (!currentUpdateInfo) {
          throw new Error('无法获取更新已信息')
        }

        const version = currentUpdateInfo.version
        // 尝试匹配 dmg 文件名
        const files = currentUpdateInfo.files || []
        const dmgFile = files.find((f: any) => f.url && f.url.endsWith('.dmg'))
        const fileName = dmgFile ? path.basename(dmgFile.url) : `ENO-M-Mac-${version}-Installer.dmg`

        // 构造下载 URL (GitHub Releases)
        const downloadUrl = `https://github.com/cloudflypeng/eno-m-desktop/releases/download/v${version}/${fileName}`

        const tempPath = path.join(app.getPath('temp'), fileName)
        downloadedDmgPath = tempPath

        // 开始下载
        const res = await fetch(downloadUrl)
        if (!res.ok) throw new Error(`Download failed: ${res.statusText}`)

        const totalLength = Number(res.headers.get('content-length')) || 0
        let downloadedLength = 0
        const fileStream = fs.createWriteStream(tempPath)

        if (!res.body) throw new Error('Response body is empty')

        // 发送开始事件
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('update-download-progress', { percent: 0 })
        })

        await new Promise<void>((resolve, reject) => {
          res.body!.on('data', (chunk: Buffer) => {
            downloadedLength += chunk.length
            fileStream.write(chunk)

            // 发送进度
            if (totalLength > 0) {
              const percent = (downloadedLength / totalLength) * 100
              BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('update-download-progress', { percent })
              })
            }
          })

          res.body!.on('end', () => {
            fileStream.end()
            resolve()
          })

          res.body!.on('error', (err) => {
            fileStream.close()
            fs.unlink(tempPath, () => { }) // 删除未完成的文件
            reject(err)
          })

          fileStream.on('error', (err) => {
            fileStream.close()
            fs.unlink(tempPath, () => { })
            reject(err)
          })
        })

        // 下载完成 (模拟 autoUpdater 事件)
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('update-downloaded')
        })

        return { success: true, message: '下载完成' }

      } catch (error: any) {
        console.error('Manual download error:', error)
        return { success: false, error: error.message }
      }
    }

    try {
      // Windows/Linux 标准流程
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
    if (process.platform === 'darwin' && downloadedDmgPath) {
      const currentAppPath = app.getPath('exe').replace(/\.app\/Contents\/MacOS\/.*$/, '.app')
      const installScriptPath = path.join(app.getPath('temp'), 'install-update.sh')

      const scriptContent = `#!/bin/bash
sleep 2
MOUNT_POINT=$(hdiutil attach -nobrowse -noautoopen "${downloadedDmgPath}" | tail -n1 | awk '{print $3}' | tr -d '\n')
if [ -z "$MOUNT_POINT" ]; then
    MOUNT_POINT=$(hdiutil attach -nobrowse -noautoopen "${downloadedDmgPath}" | grep "/Volumes" | awk -F '/Volumes' '{print "/Volumes"$2}' | tr -d '\n')
fi

if [ -n "$MOUNT_POINT" ]; then
    rm -rf "${currentAppPath}"
    cp -R "$MOUNT_POINT/"*.app "${currentAppPath}"
    hdiutil detach "$MOUNT_POINT"
    open "${currentAppPath}"
fi
rm -f "${installScriptPath}"
`
      fs.writeFileSync(installScriptPath, scriptContent)
      fs.chmodSync(installScriptPath, '755')

      spawn(installScriptPath, {
        detached: true,
        stdio: 'ignore'
      }).unref()

      app.quit()
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

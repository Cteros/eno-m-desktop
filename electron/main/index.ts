import { app, BrowserWindow, shell, ipcMain, session, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'
import { apiProxy } from '../bili/api/index'
import { initCookie, setGlobalCookie, getGlobalCookie } from '../bili/cookie'
import { setupDownloadHandlers } from './download'
import { setupUpdateHandlers } from './update'
import { generateQR, pollQR, fetchUserInfo } from '../bili/login'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 注册协议
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('eno-m', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('eno-m')
}

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null

// 处理协议链接
function handleUrl(url: string) {
  console.log('handleUrl', url)
  if (!url) return
  try {
    const urlObj = new URL(url)
    if (urlObj.protocol === 'eno-m:') {
      const cookie = urlObj.searchParams.get('cookie')
      if (cookie) {
        setGlobalCookie(cookie)
        console.log('Cookie set from URL protocol')
        // 可以选择通知渲染进程
        if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
          win.webContents.send('cookie-updated', cookie)
        }
      }
    }
  } catch (error) {
    console.error('Failed to handle URL:', error)
  }
}

const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  // 初始化 cookie
  initCookie()

  win = new BrowserWindow({
    title: 'Main window',
    // icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    icon: path.join(process.env.VITE_PUBLIC, 'download.png'),
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 400,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    vibrancy: 'fullscreen-ui', // macOS 毛玻璃效果
    backgroundMaterial: 'acrylic', // Windows 11 云母/亚克力效果
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.whenReady().then(() => {
  createWindow()
  setupDownloadHandlers()
  setupUpdateHandlers()
  ipcMain.handle('set-window-size', async (_event, size: { width: number; height: number }) => {
    if (!win || win.isDestroyed())
      return { success: false }
    const width = Math.max(200, Math.floor(size?.width || 960))
    const height = Math.max(400, Math.floor(size?.height || 640))
    win.setSize(width, height, true)
    win.center()
    return { success: true }
  })
  // Bilibili QR Login IPC
  ipcMain.handle('bili-qr-generate', async () => {
    try {
      const result = await generateQR()
      return { url: result.url, oauthKey: result.oauthKey, qrImage: result.qrImage }
    } catch (e: any) {
      return { error: e.message }
    }
  })

  ipcMain.handle('bili-qr-poll', async (_e, oauthKey: string) => {
    try {
      const res = await pollQR(oauthKey)
      return res
    } catch (e: any) {
      return { status: 'failed', error: e.message }
    }
  })
  ipcMain.handle('bili-user-info', async () => {
    try {
      const info = await fetchUserInfo()
      return { success: true, info }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('bili-logout', async () => {
    try {
      // 清除本地存储的 Cookie
      const fs = await import('node:fs')
      const path = await import('node:path')
      const app = await import('electron')
      const cookieFile = path.join(app.app.getPath('userData'), 'bili_cookie.dat')
      if (fs.existsSync(cookieFile)) {
        fs.unlinkSync(cookieFile)
      }
      // 清除全局 Cookie
      setGlobalCookie('')
      // 通知渲染进程用户信息已更新
      if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
        win.webContents.send('bili-user-updated')
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
  // 拦截 B 站图片请求，设置 Referer 防止 403
  session.defaultSession.webRequest.onBeforeSendHeaders({
    urls: [
      '*://*.hdslb.com/*',
      '*://*.bilivideo.com/*',
      '*://*.mcdn.bilivideo.cn/*',
      '*://*.biliimg.com/*',
      '*://*.biliimg.com.cn/*',
      '*://*.biliimg.com.cn/*',
      '*://*.biliimg.cn/*',
      'https://*.bilibili.com/*',
      'https://*.bilivideo.com/*',
      'https://*.bilivideo.cn/*',
      'https://account.bilibili.com/*'
    ]
  }, (details, callback) => {
    details.requestHeaders['Referer'] = 'https://www.bilibili.com/'
    callback({ requestHeaders: details.requestHeaders })
  })
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', (event, commandLine, _workingDirectory) => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
  // Windows 下处理协议链接
  const url = commandLine.find(arg => arg.startsWith('eno-m://'))
  if (url) handleUrl(url)
})

// macOS 下处理协议链接
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleUrl(url)
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// 打开外部 URL 的新窗口（renderer 可以通过 ipcRenderer.invoke('open-external-window', url) 调用）
ipcMain.handle('open-external-window', async (_e, url: string) => {
  try {
    if (!url) return { success: false, error: 'empty url' }

    const child = new BrowserWindow({
      width: 1000,
      height: 800,
      webPreferences: {
        preload,
        // 为外部页面保守起见禁用 nodeIntegration
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // 为新窗口的 session 配置请求头拦截（与主窗口保持一致）
    child.webContents.session.webRequest.onBeforeSendHeaders({
      urls: [
        '*://*.hdslb.com/*',
        '*://*.bilivideo.com/*',
        '*://*.mcdn.bilivideo.cn/*',
        '*://*.biliimg.com.cn/*',
        '*://*.biliimg.cn/*',
        'https://*.bilibili.com/*',
        'https://*.bilivideo.com/*',
        'https://*.bilivideo.cn/*',
        'https://account.bilibili.com/*'
      ]
    }, (details, callback) => {
      details.requestHeaders['Referer'] = 'https://www.bilibili.com/'
      callback({ requestHeaders: details.requestHeaders })
    })

    // 如果主进程持有全局 Cookie，则尝试将其注入到新窗口的 session 中
    try {
      const cookieStr = getGlobalCookie()
      if (cookieStr && cookieStr.trim()) {
        const origin = new URL(url).origin
        // 简单分割：按 '; ' 或 ';' 分割，但要排除 cookie 属性（HttpOnly, Path, etc.）
        const cookiePairs = cookieStr.split(/;\s*/).filter(p => {
          const lower = p.toLowerCase()
          // 跳过属性字段
          return !lower.startsWith('httponly') && !lower.startsWith('secure') &&
            !lower.startsWith('samesite') && !lower.startsWith('path=') &&
            !lower.startsWith('domain=') && !lower.startsWith('expires=') &&
            !lower.startsWith('max-age=')
        })

        for (const pair of cookiePairs) {
          const eq = pair.indexOf('=')
          if (eq > 0) {
            const name = pair.substring(0, eq).trim()
            const value = pair.substring(eq + 1).trim()
            try {
              // 写入到 child 窗口的 session，设置 path 为 /
              await child.webContents.session.cookies.set({ url: origin, name, value, path: '/' })
            } catch (err) {
              console.warn('Failed to set cookie on child session:', name, err)
            }
          }
        }
        console.log('Cookies injected into child window session')
      }
    } catch (err) {
      console.warn('Failed to inject cookies into new window session:', err)
    }

    // 确保 session 配置生效后再加载 URL（延迟 100ms）
    await new Promise(resolve => setTimeout(resolve, 100))

    await child.loadURL(url)
    return { success: true }
  } catch (err: any) {
    console.error('Failed to open external window:', err)
    return { success: false, error: err?.message }
  }
})

ipcMain.handle('bili-api', async (_, message) => {
  try {
    const res = await apiProxy(message)
    return res
  } catch (error) {
    console.error('Bili API invoke error:', error)
    throw error
  }
})

// 选择下载目录
ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择下载位置',
      message: '请选择音乐下载目录',
      defaultPath: app.getPath('downloads'),
    })

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] }
    } else {
      return { success: false, path: null }
    }
  } catch (error: any) {
    console.error('Failed to select directory:', error)
    return { success: false, error: error.message }
  }
})

// 获取 FFmpeg 诊断信息
ipcMain.handle('get-ffmpeg-info', () => {
  const diagnostics: any = {
    platform: process.platform,
    arch: process.arch,
    paths: [],
    found: false,
  }

  // 检查常见路径
  const commonPaths = [
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  ]

  for (const p of commonPaths) {
    try {
      const result = execSync(`"${p}" -version 2>&1`, { encoding: 'utf-8' }).split('\n')[0]
      diagnostics.paths.push({
        path: p,
        found: true,
        version: result.substring(0, 50),
      })
      diagnostics.found = true
    } catch {
      diagnostics.paths.push({
        path: p,
        found: false,
      })
    }
  }

  // 尝试在 PATH 中查找
  try {
    const result = execSync('ffmpeg -version 2>&1', { encoding: 'utf-8' }).split('\n')[0]
    diagnostics.inPath = true
    diagnostics.pathVersion = result
    diagnostics.found = true
  } catch {
    diagnostics.inPath = false
  }

  // 尝试使用 which 命令
  try {
    const result = execSync('which ffmpeg', { encoding: 'utf-8' }).trim()
    diagnostics.whichResult = result
  } catch {
    diagnostics.whichResult = null
  }

  return diagnostics
})

import { app, BrowserWindow, shell, ipcMain, session, dialog, Tray, Menu, nativeImage, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import { apiProxy } from '../bili/api/index'
import { initCookie, setGlobalCookie, getGlobalCookie } from '../bili/cookie'
import { setupDownloadHandlers } from './download'
import { setupUpdateHandlers } from './update'
import { generateQR, pollQR, fetchUserInfo } from '../bili/login'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function setupNoiseFilters() {
  const noisePatterns = [
    "Request Autofill.enable failed. {\"code\":-32601,\"message\":\"'Autofill.enable' wasn't found\"}",
    "Request Autofill.setAddresses failed. {\"code\":-32601,\"message\":\"'Autofill.setAddresses' wasn't found\"}",
    'SetApplicationIsDaemon: Error Domain=NSOSStatusErrorDomain Code=-50',
  ]

  const rawStderrWrite = process.stderr.write.bind(process.stderr)
  process.stderr.write = ((chunk: any, encoding?: any, cb?: any) => {
    try {
      const text = typeof chunk === 'string' ? chunk : chunk?.toString?.(encoding || 'utf8') || ''
      if (text && noisePatterns.some(pattern => text.includes(pattern))) {
        if (typeof cb === 'function')
          cb()
        return true
      }
    } catch {
      // ignore
    }
    return rawStderrWrite(chunk, encoding, cb)
  }) as typeof process.stderr.write
}

setupNoiseFilters()

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
let tray: Tray | null = null
let miniPlayerWin: BrowserWindow | null = null
const subtitleTaskMap = new Map<string, Promise<any>>()
let subtitleDb: any = null

function emitAsrLog(songId: string, line: string) {
  try {
    const payload = {
      songId,
      line,
      ts: Date.now(),
    }
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed() && !w.webContents.isDestroyed())
        w.webContents.send('asr-log-line', payload)
    }
  } catch {
    // ignore
  }
}

function getAsrBinaryBasename() {
  return process.platform === 'win32' ? 'transcribe-subtitle.exe' : 'transcribe-subtitle'
}

function resolveAsrBinaryPath() {
  const basename = getAsrBinaryBasename()
  const platformArch = `${process.platform}-${process.arch}`
  const candidates = [
    // packaged resources
    path.join(process.resourcesPath, 'asr', basename),
    path.join(process.resourcesPath, 'asr', platformArch, basename),
    // dev workspace fallback
    path.join(process.env.APP_ROOT, 'bin', 'asr', basename),
    path.join(process.env.APP_ROOT, 'bin', 'asr', platformArch, basename),
  ]
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      try {
        if (process.platform !== 'win32')
          fs.chmodSync(filePath, 0o755)
      } catch {
        // ignore chmod errors
      }
      return filePath
    }
  }
  return ''
}

function resolvePythonBin() {
  const bins = ['python3', 'python']
  for (const bin of bins) {
    try {
      execSync(`${bin} --version`, { stdio: 'ignore' })
      return bin
    } catch {
      // try next
    }
  }
  return ''
}

function ensureSubtitleScriptPath() {
  const sourcePath = path.join(process.env.APP_ROOT, 'electron', 'main', 'scripts', 'transcribe_subtitle.py')
  const targetDir = path.join(app.getPath('userData'), 'scripts')
  const targetPath = path.join(targetDir, 'transcribe_subtitle.py')
  if (!fs.existsSync(sourcePath))
    throw new Error(`subtitle script not found: ${sourcePath}`)
  if (!fs.existsSync(targetDir))
    fs.mkdirSync(targetDir, { recursive: true })
  const sourceContent = fs.readFileSync(sourcePath, 'utf8')
  const currentContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : ''
  if (sourceContent !== currentContent)
    fs.writeFileSync(targetPath, sourceContent, 'utf8')
  return targetPath
}

function getSubtitleDb() {
  if (subtitleDb)
    return subtitleDb
  const dbPath = path.join(app.getPath('userData'), 'subtitle-cache.sqlite')
  const sqlite: any = require('node:sqlite')
  const DatabaseSync = sqlite?.DatabaseSync
  if (!DatabaseSync)
    throw new Error('node:sqlite is unavailable in current runtime')
  subtitleDb = new DatabaseSync(dbPath)
  subtitleDb.exec(`
    CREATE TABLE IF NOT EXISTS subtitle_cache (
      song_id TEXT PRIMARY KEY,
      lines_json TEXT NOT NULL,
      model TEXT,
      language TEXT,
      created_at INTEGER NOT NULL
    )
  `)
  return subtitleDb
}

function loadSubtitleCache(songId: string, model: string, language: string) {
  const db = getSubtitleDb()
  const row = db.prepare(
    'SELECT lines_json, model, language FROM subtitle_cache WHERE song_id = ? LIMIT 1'
  ).get(songId)
  if (!row)
    return null
  if (String(row.model || '') !== model || String(row.language || '') !== language)
    return null
  try {
    return JSON.parse(String(row.lines_json || '[]'))
  } catch {
    return null
  }
}

function saveSubtitleCache(songId: string, lines: any[], model: string, language: string, maxCache: number) {
  const db = getSubtitleDb()
  const now = Math.floor(Date.now() / 1000)
  db.prepare(`
    INSERT INTO subtitle_cache(song_id, lines_json, model, language, created_at)
    VALUES(?, ?, ?, ?, ?)
    ON CONFLICT(song_id) DO UPDATE SET
      lines_json = excluded.lines_json,
      model = excluded.model,
      language = excluded.language,
      created_at = excluded.created_at
  `).run(songId, JSON.stringify(lines || []), model, language, now)
  db.prepare(`
    DELETE FROM subtitle_cache
    WHERE song_id NOT IN (
      SELECT song_id
      FROM subtitle_cache
      ORDER BY created_at DESC
      LIMIT ?
    )
  `).run(Math.max(1, Number(maxCache || 100)))
}

async function runSubtitleJob(payload: {
  songId: string
  audioUrl: string
  language?: string
  model?: string
  maxCache?: number
  cacheOnly?: boolean
  forceRetranscribe?: boolean
}) {
  const model = payload.model || 'large-v3'
  const language = payload.language || 'zh'
  const maxCache = Number(payload.maxCache || 100)
  const cacheOnly = !!payload.cacheOnly
  const forceRetranscribe = !!payload.forceRetranscribe

  const input = {
    song_id: payload.songId,
    audio_url: payload.audioUrl,
    language,
    model,
    model_root: path.join(app.getPath('userData'), 'asr-models'),
    compute_type: process.env.ENO_WHISPER_COMPUTE_TYPE || 'int8',
    device: process.env.ENO_WHISPER_DEVICE || 'auto',
  }

  if (!forceRetranscribe) {
    const cachedLines = loadSubtitleCache(payload.songId, model, language)
    if (cachedLines) {
      emitAsrLog(payload.songId, 'cache hit (js sqlite)')
      return { success: true, cacheHit: true, lines: cachedLines }
    }
  }
  if (cacheOnly) {
    emitAsrLog(payload.songId, 'cache miss (js sqlite, cache-only)')
    return { success: false, error: 'cache_miss' }
  }

  const binaryPath = resolveAsrBinaryPath()
  const pythonBin = binaryPath ? '' : resolvePythonBin()
  const scriptPath = binaryPath ? '' : ensureSubtitleScriptPath()
  if (!binaryPath && !pythonBin)
    throw new Error('ASR binary not found and Python unavailable. Place binary under resources/asr or install python3+faster-whisper')

  const inputFile = path.join(
    app.getPath('temp'),
    `eno-subtitle-input-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  )
  fs.writeFileSync(inputFile, JSON.stringify(input), 'utf8')

  const spawnCmd = binaryPath || pythonBin
  const spawnArgs = binaryPath
    ? ['--input', inputFile]
    : [scriptPath, '--input', inputFile]

  return await new Promise((resolve, reject) => {
    emitAsrLog(payload.songId, 'ASR task started')
    const child = spawn(spawnCmd, spawnArgs, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      emitAsrLog(payload.songId, 'ASR task timeout')
      reject(new Error('subtitle transcription timeout'))
    }, 30 * 60 * 1000)

    child.stdout.on('data', chunk => (stdout += chunk.toString()))
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
      for (const line of lines) {
        console.log(`[ASR] ${line}`)
        emitAsrLog(payload.songId, line)
      }
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      emitAsrLog(payload.songId, `ASR process error: ${err?.message || err}`)
      try {
        fs.unlinkSync(inputFile)
      } catch {
        // ignore
      }
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      try {
        fs.unlinkSync(inputFile)
      } catch {
        // ignore
      }
      if (code !== 0 && !stdout.trim())
        return reject(new Error(stderr || `subtitle process exited with code ${code}`))
      try {
        const parsed = JSON.parse(stdout.trim() || '{}')
        if (!parsed?.success)
          return reject(new Error(parsed?.error || stderr || 'subtitle transcription failed'))
        const lines = Array.isArray(parsed?.lines) ? parsed.lines : []
        saveSubtitleCache(payload.songId, lines, model, language, maxCache)
        emitAsrLog(payload.songId, 'ASR task completed')
        resolve({ ...parsed, cacheHit: false, lines })
      } catch (e: any) {
        reject(new Error(`invalid subtitle response: ${stdout || stderr || e?.message}`))
      }
    })
    child.stdin.end()
  })
}

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

function createMiniPlayerWindow() {
  if (miniPlayerWin && !miniPlayerWin.isDestroyed()) return miniPlayerWin

  miniPlayerWin = new BrowserWindow({
    width: 320,
    height: 220,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload,
    },
  })

  miniPlayerWin.setMenu(null)
  miniPlayerWin.setAlwaysOnTop(true, 'pop-up-menu')
  miniPlayerWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (VITE_DEV_SERVER_URL) {
    miniPlayerWin.loadURL(`${VITE_DEV_SERVER_URL}#/miniplayer`)
  } else {
    miniPlayerWin.loadFile(indexHtml, { hash: '/miniplayer' })
  }

  miniPlayerWin.on('blur', () => {
    if (miniPlayerWin?.webContents.isDevToolsOpened()) return
    miniPlayerWin?.hide()
  })

  miniPlayerWin.on('closed', () => {
    miniPlayerWin = null
  })

  return miniPlayerWin
}

function showMiniPlayer() {
  if (!tray) return
  const mini = createMiniPlayerWindow()
  const trayBounds = tray.getBounds()
  const winBounds = mini.getBounds()
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y })
  const maxX = display.workArea.x + display.workArea.width - winBounds.width
  const minX = display.workArea.x

  const x = Math.min(
    Math.max(Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2), minX),
    maxX
  )
  const y = Math.round(trayBounds.y + trayBounds.height + 4)

  mini.setPosition(x, y, false)
  mini.show()
  mini.focus()
}

function toggleMiniPlayer() {
  if (!miniPlayerWin || miniPlayerWin.isDestroyed()) {
    showMiniPlayer()
    return
  }
  if (miniPlayerWin.isVisible()) miniPlayerWin.hide()
  else showMiniPlayer()
}

function createTray() {
  if (process.platform !== 'darwin') return
  if (tray && !tray.isDestroyed()) return

  const iconPath = path.join(process.env.VITE_PUBLIC, 'logo.png')
  const image = nativeImage.createFromPath(iconPath)
  const trayIcon = image.isEmpty() ? image : image.resize({ width: 18, height: 18 })

  tray = new Tray(trayIcon)
  tray.setToolTip('Eno M')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主窗口',
      click: () => {
        if (win && !win.isDestroyed()) {
          win.show()
          win.focus()
        } else {
          createWindow()
        }
      },
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => toggleMiniPlayer())
}

async function createWindow() {
  // 初始化 cookie
  initCookie()

  win = new BrowserWindow({
    title: 'Main window',
    // icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    icon: path.join(process.env.VITE_PUBLIC, 'download.png'),
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
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
  createTray()
  setupDownloadHandlers()
  setupUpdateHandlers()
  ipcMain.handle('set-window-size', async (_event, size: { width: number; height: number }) => {
    if (!win || win.isDestroyed())
      return { success: false }
    const width = Math.max(960, Math.floor(size?.width || 960))
    const height = Math.max(640, Math.floor(size?.height || 640))
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
  ipcMain.handle('show-main-window', async () => {
    if (win && !win.isDestroyed()) {
      win.show()
      win.focus()
      return { success: true }
    }
    createWindow()
    return { success: true }
  })
  ipcMain.on('mini-player-command', (_event, cmd) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('mini-player-command', cmd)
    }
  })
  ipcMain.on('mini-player-request-state', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('mini-player-request-state')
    }
  })
  ipcMain.on('mini-player-state', (_event, state) => {
    if (miniPlayerWin && !miniPlayerWin.isDestroyed()) {
      miniPlayerWin.webContents.send('mini-player-state', state)
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

ipcMain.handle('subtitle-ai-get-by-song-id', async (_event, payload: any) => {
  try {
    const songId = String(payload?.songId || '').trim()
    const audioUrl = String(payload?.audioUrl || '').trim()
    if (!songId)
      return { success: false, error: 'songId is required' }
    if (!audioUrl)
      return { success: false, error: 'audioUrl is required' }

    if (subtitleTaskMap.has(songId))
      return await subtitleTaskMap.get(songId)

    const task = runSubtitleJob({
      songId,
      audioUrl,
      language: String(payload?.language || 'zh'),
      model: String(payload?.model || 'large-v3'),
      maxCache: Number(payload?.maxCache || 100),
      cacheOnly: !!payload?.cacheOnly,
      forceRetranscribe: !!payload?.forceRetranscribe,
    })
      .then((res: any) => ({
        success: true,
        cacheHit: !!res?.cacheHit,
        lines: Array.isArray(res?.lines) ? res.lines : [],
      }))
      .catch((err: any) => ({
        success: false,
        error: err?.message || String(err),
      }))
      .finally(() => {
        subtitleTaskMap.delete(songId)
      })

    subtitleTaskMap.set(songId, task)
    return await task
  } catch (error: any) {
    return { success: false, error: error?.message || 'subtitle task failed' }
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

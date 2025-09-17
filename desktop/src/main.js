const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const net = require('net')

// Ensure ffmpeg/ffprobe are visible when spawned from app (Homebrew paths)
const HOMEBREW_BIN = '/opt/homebrew/bin'
const USR_LOCAL_BIN = '/usr/local/bin'
const withBrewPath = (p) => [HOMEBREW_BIN, USR_LOCAL_BIN, p || ''].filter(Boolean).join(':')

// Read frontend port from root config.js (best-effort)
function getFrontendPort() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require('../../config.js')
    if (cfg && cfg.FRONTEND_PORT) return cfg.FRONTEND_PORT
  } catch (_) {}
  return 3000
}

const isDev = !!(process.env.ELECTRON_START_URL || process.env.NODE_ENV === 'development')
const FRONTEND_PORT = getFrontendPort()

// Simple logger to file under userData
function logLine(...args) {
  try {
    const dir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const line = `[${new Date().toISOString()}] ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}\n`
    fs.appendFileSync(path.join(dir, 'desktop.log'), line)
  } catch (_) {}
}

let backendInfo = { port: 8001, pid: null, mode: isDev ? 'dev' : 'prod' }
let backendProcess = null
let lastLoadTarget = ''

async function isPortFree(port) {
  return new Promise(resolve => {
    const tester = net.createServer()
    tester.once('error', () => resolve(false))
    tester.once('listening', () => tester.close(() => resolve(true)))
    tester.listen(port, '127.0.0.1')
  })
}

async function findPort(candidates = [8001, 8011, 8021]) {
  for (const p of candidates) {
    // Skip if busy
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(p)) return p
  }
  // Fallback to ephemeral
  return new Promise(resolve => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

function waitForHealth(port, { attempts = (isDev ? 20 : 60), delayMs = 500 } = {}) {
  const url = `http://127.0.0.1:${port}/health`
  let attempt = 0
  return new Promise((resolve, reject) => {
    const tick = () => {
      attempt += 1
      const req = http.get(url, res => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          logLine('health_ok', url, `attempt=${attempt}`)
          resolve(true)
        } else {
          res.resume()
          if (attempt >= attempts) return reject(new Error('health_failed'))
          setTimeout(tick, delayMs)
        }
      })
      req.on('error', () => {
        if (attempt >= attempts) return reject(new Error('health_failed'))
        setTimeout(tick, delayMs)
      })
    }
    tick()
  })
}

function dataDir() {
  // Ensure a stable data dir for DB/uploads/logs
  return app.getPath('userData')
}

async function startBackendDev() {
  const port = await findPort()
  backendInfo.port = port
  const env = { ...process.env, PATH: withBrewPath(process.env.PATH), SIGNALHUB_MODE: 'desktop', SIGNALHUB_PORT: String(port), SIGNALHUB_DATA_DIR: dataDir(), SIGNALHUB_ENABLE_TRANSCRIPTION: '1' }
  const cwd = path.join(__dirname, '..', '..', 'backend')
  const args = ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(port)]
  logLine('spawn_backend_dev', JSON.stringify({ cwd, args, env: { SIGNALHUB_MODE: env.SIGNALHUB_MODE, SIGNALHUB_PORT: env.SIGNALHUB_PORT, SIGNALHUB_DATA_DIR: env.SIGNALHUB_DATA_DIR } }))
  backendProcess = spawn(process.env.ELECTRON_PYTHON || 'python', args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  backendInfo.pid = backendProcess.pid
  backendProcess.stdout.on('data', d => logLine('backend_stdout', String(d).trim()))
  backendProcess.stderr.on('data', d => logLine('backend_stderr', String(d).trim()))
  backendProcess.on('exit', (code, signal) => logLine('backend_exit', `code=${code}`, `signal=${signal}`))
  try {
    await waitForHealth(port)
  } catch (e) {
    logLine('backend_health_failed', e.message)
    throw e
  }
}

async function startBackendProd() {
  const port = await findPort()
  backendInfo.port = port
  const env = { ...process.env, PATH: withBrewPath(process.env.PATH), SIGNALHUB_MODE: 'desktop', SIGNALHUB_PORT: String(port), SIGNALHUB_DATA_DIR: dataDir(), SIGNALHUB_ENABLE_TRANSCRIPTION: '1' }
  const binName = process.platform === 'win32' ? 'signalhub-backend.exe' : 'signalhub-backend'
  const binPath = path.join(process.resourcesPath, 'backend', binName)
  logLine('spawn_backend_prod', JSON.stringify({ binPath, env: { SIGNALHUB_MODE: env.SIGNALHUB_MODE, SIGNALHUB_PORT: env.SIGNALHUB_PORT, SIGNALHUB_DATA_DIR: env.SIGNALHUB_DATA_DIR } }))
  backendProcess = spawn(binPath, [], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  backendInfo.pid = backendProcess.pid
  backendProcess.stdout.on('data', d => logLine('backend_stdout', String(d).trim()))
  backendProcess.stderr.on('data', d => logLine('backend_stderr', String(d).trim()))
  backendProcess.on('exit', (code, signal) => logLine('backend_exit', `code=${code}`, `signal=${signal}`))
  try {
    await waitForHealth(port)
  } catch (e) {
    logLine('backend_health_failed', e.message)
    throw e
  }
}

let mainWindow = null

async function createMainWindow() {
  // Start backend BEFORE creating the window so preload sees the correct port
  try {
    if (isDev) {
      await startBackendDev()
    } else {
      await startBackendProd()
    }
  } catch (e) {
    logLine('backend_start_error', e.message)
    // Continue; UI will show an error but preload will still expose backendInfo
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  const devUrl = `http://localhost:${FRONTEND_PORT}`
  const prodIndex = path.join(process.resourcesPath, 'frontend_dist', 'index.html')
  const loadTarget = isDev ? devUrl : `file://${prodIndex}`
  lastLoadTarget = loadTarget

  mainWindow.once('ready-to-show', () => mainWindow && mainWindow.show())
  mainWindow.loadURL(loadTarget)

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

function createAppMenu() {
  const openLogs = () => {
    try {
      const dir = path.join(app.getPath('userData'), 'logs')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      shell.openPath(dir)
    } catch (e) {
      logLine('open_logs_error', e.message)
    }
  }

  const openResources = () => {
    try {
      shell.openPath(process.resourcesPath)
    } catch (e) {
      logLine('open_resources_error', e.message)
    }
  }

  const showBackendInfo = () => {
    const msg = `Mode: ${backendInfo.mode}\nPort: ${backendInfo.port}\nPID: ${backendInfo.pid || 'n/a'}`
    dialog.showMessageBox({ type: 'info', title: 'Backend Info', message: 'Backend Information', detail: msg })
  }

  const showLoadTarget = () => {
    dialog.showMessageBox({ type: 'info', title: 'Load Target', message: 'Renderer Load Target', detail: lastLoadTarget || '(unknown)' })
  }

  const runHealthCheck = async () => {
    const url = `http://127.0.0.1:${backendInfo.port}/health`
    try {
      const status = await new Promise((resolve, reject) => {
        const req = http.get(url, res => {
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300
          res.resume()
          ok ? resolve('OK') : reject(new Error(`HTTP ${res.statusCode}`))
        })
        req.on('error', reject)
      })
      dialog.showMessageBox({ type: 'info', title: 'Health Check', message: `Backend health: ${status}`, detail: url })
    } catch (e) {
      dialog.showMessageBox({ type: 'error', title: 'Health Check', message: 'Backend health failed', detail: `${url}\n${e.message}` })
    }
  }

  const template = [
    {
      label: 'SignalHub',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Debug',
      submenu: [
        { label: 'Toggle DevTools', click: () => { if (mainWindow) mainWindow.webContents.toggleDevTools() } },
        { type: 'separator' },
        { label: 'Show Backend Info', click: showBackendInfo },
        { label: 'Run Health Check', click: runHealthCheck },
        { label: 'Show Load Target', click: showLoadTarget },
        { type: 'separator' },
        { label: 'Open Logs Folder', click: openLogs },
        { label: 'Open Resources Folder', click: openResources }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.on('ready', () => {
  createAppMenu()
  createMainWindow()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  try {
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill()
    }
  } catch (_) {}
})

// IPC for renderer to get backend info
ipcMain.handle('get-backend-info', async () => backendInfo)
ipcMain.on('get-backend-info-sync', (event) => {
  event.returnValue = backendInfo
})

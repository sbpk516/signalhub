const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const net = require('net')
const { checkForUpdates, CHECK_INTERVAL_MS, getLatestManifest } = require('./main/update-checker')
const dictationSettings = require('./main/dictation-settings')
const DictationManager = require('./main/dictation-manager')
let macPermissions = null
try {
  macPermissions = require('node-mac-permissions')
} catch (error) {
  macPermissions = null
}

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
let updateInterval = null
let dictationSettingsReady = false
let dictationManager = null

async function syncDictationManager(settings) {
  try {
    const manager = getDictationManager()
    if (settings && typeof settings.shortcut === 'string') {
      await manager.updateShortcut({ shortcut: settings.shortcut })
    }
    if (settings && settings.enabled) {
      const started = await manager.startListening(settings)
      if (started) {
        logLine('dictation_manager_started', settings)
      } else {
        logLine('dictation_manager_start_failed', { platform: process.platform })
        broadcastDictationLifecycle('dictation:listener-fallback', {
          reason: 'listener_failed',
          platform: process.platform,
        })
      }
    } else {
      await manager.stopListening()
      logLine('dictation_manager_stopped')
    }
  } catch (error) {
    logLine('dictation_manager_sync_error', error.message)
  }
}

async function checkMacAccessibility() {
  if (process.platform !== 'darwin' || !macPermissions) {
    return true
  }
  try {
    const trusted = macPermissions.isTrustedAccessibilityClient?.(false)
    logLine('dictation_accessibility_status', { trusted })
    return !!trusted
  } catch (error) {
    logLine('dictation_accessibility_check_error', error.message)
    return false
  }
}

async function checkMacMicPermission() {
  if (process.platform !== 'darwin' || !macPermissions) {
    return true
  }
  try {
    const status = macPermissions.getMicrophoneAuthorizationStatus?.()
    logLine('dictation_microphone_status', { status })
    return status === 'authorized' || status === 'not determined'
  } catch (error) {
    logLine('dictation_microphone_check_error', error.message)
    return false
  }
}

async function promptMacPermissions() {
  if (process.platform !== 'darwin' || !macPermissions) {
    return { accessibility: true, microphone: true }
  }
  let accessibility = false
  let microphone = false
  try {
    accessibility = macPermissions.isTrustedAccessibilityClient?.(true) ?? false
    logLine('dictation_accessibility_prompt', { accessibility })
  } catch (error) {
    logLine('dictation_accessibility_prompt_error', error.message)
  }
  try {
    microphone = macPermissions.askForMicrophoneAccess?.() ?? false
    logLine('dictation_microphone_prompt', { microphone })
  } catch (error) {
    logLine('dictation_microphone_prompt_error', error.message)
  }
  return { accessibility, microphone }
}

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
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      attempt += 1
      const req = http.get(url, res => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          const elapsed = Date.now() - startedAt
          logLine('health_ok', url, `attempt=${attempt}`, `elapsed_ms=${elapsed}`)
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
  const env = { 
    ...process.env, 
    PATH: withBrewPath(process.env.PATH), 
    SIGNALHUB_MODE: 'desktop', 
    SIGNALHUB_PORT: String(port), 
    SIGNALHUB_DATA_DIR: dataDir(), 
    SIGNALHUB_ENABLE_TRANSCRIPTION: '1',
    SIGNALHUB_LIVE_TRANSCRIPTION: '1',
    SIGNALHUB_LIVE_MIC: '1',
    // Batch-only live mic to ensure full transcript at stop()
    SIGNALHUB_LIVE_BATCH_ONLY: '1',
  }
  const cwd = path.join(__dirname, '..', '..', 'backend')
  const args = ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(port)]
  logLine('spawn_backend_dev', JSON.stringify({ cwd, args, env: { SIGNALHUB_MODE: env.SIGNALHUB_MODE, SIGNALHUB_PORT: env.SIGNALHUB_PORT, SIGNALHUB_DATA_DIR: env.SIGNALHUB_DATA_DIR } }))
  backendProcess = spawn(process.env.ELECTRON_PYTHON || 'python', args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  backendInfo.pid = backendProcess.pid
  backendProcess.stdout.on('data', d => logLine('backend_stdout', String(d).trim()))
  backendProcess.stderr.on('data', d => logLine('backend_stderr', String(d).trim()))
  backendProcess.on('exit', (code, signal) => logLine('backend_exit', `code=${code}`, `signal=${signal}`))
  let waitStart = Date.now()
  try {
    waitStart = Date.now()
    await waitForHealth(port)
    logLine('backend_health_ready', { port, elapsed_ms: Date.now() - waitStart })
  } catch (e) {
    logLine('backend_health_failed', { error: e.message, elapsed_ms: Date.now() - waitStart })
    throw e
  }
}

async function startBackendProd() {
  const port = await findPort()
  backendInfo.port = port
  const env = { 
    ...process.env, 
    PATH: withBrewPath(process.env.PATH), 
    SIGNALHUB_MODE: 'desktop', 
    SIGNALHUB_PORT: String(port), 
    SIGNALHUB_DATA_DIR: dataDir(), 
    SIGNALHUB_ENABLE_TRANSCRIPTION: '1',
    SIGNALHUB_LIVE_TRANSCRIPTION: '1',
    SIGNALHUB_LIVE_MIC: '1',
    // Batch-only live mic to ensure full transcript at stop()
    SIGNALHUB_LIVE_BATCH_ONLY: '1',
    // Ensure Whisper uses bundled cache for offline models
    XDG_CACHE_HOME: path.join(process.resourcesPath, 'whisper_cache'),
  }
  const binName = process.platform === 'win32' ? 'signalhub-backend.exe' : 'signalhub-backend'
  const binPath = path.join(process.resourcesPath, 'backend', binName)
  logLine('spawn_backend_prod', JSON.stringify({ binPath, env: { SIGNALHUB_MODE: env.SIGNALHUB_MODE, SIGNALHUB_PORT: env.SIGNALHUB_PORT, SIGNALHUB_DATA_DIR: env.SIGNALHUB_DATA_DIR } }))
  backendProcess = spawn(binPath, [], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  backendInfo.pid = backendProcess.pid
  backendProcess.stdout.on('data', d => logLine('backend_stdout', String(d).trim()))
  backendProcess.stderr.on('data', d => logLine('backend_stderr', String(d).trim()))
  backendProcess.on('exit', (code, signal) => logLine('backend_exit', `code=${code}`, `signal=${signal}`))
  let waitStart = Date.now()
  try {
    waitStart = Date.now()
    await waitForHealth(port)
    logLine('backend_health_ready', { port, elapsed_ms: Date.now() - waitStart })
  } catch (e) {
    logLine('backend_health_failed', { error: e.message, elapsed_ms: Date.now() - waitStart })
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

app.on('ready', async () => {
  let initialDictationSettings = null
  try {
    initialDictationSettings = dictationSettings.loadSettings()
    dictationSettingsReady = true
    logLine('dictation_settings_loaded', initialDictationSettings)
  } catch (error) {
    logLine('dictation_settings_load_error', error.message)
  }
  if (initialDictationSettings) {
    await syncDictationManager(initialDictationSettings)
  } else {
    await syncDictationManager({ enabled: false })
  }
  const manager = getDictationManager()
  manager.on('dictation:press-start', payload => {
    logLine('dictation_event_start', payload)
    broadcastDictationLifecycle('dictation:press-start', payload)
  })
  manager.on('dictation:press-end', payload => {
    logLine('dictation_event_end', payload)
    broadcastDictationLifecycle('dictation:press-end', payload)
  })
  manager.on('dictation:press-cancel', payload => {
    logLine('dictation_event_cancel', payload)
    broadcastDictationLifecycle('dictation:press-cancel', payload)
  })
  manager.on('dictation:request-start', async (payload) => {
    logLine('dictation_permission_request', payload)
    const accessibilityOk = await checkMacAccessibility()
    const micOk = await checkMacMicPermission()
    broadcastDictationLifecycle('dictation:permission-requested', {
      ...payload,
      accessibilityOk,
      micOk,
    })
    if (!accessibilityOk || !micOk) {
      broadcastDictationLifecycle('dictation:permission-required', {
        ...payload,
        accessibilityOk,
        micOk,
      })
    }
  })
  manager.on('dictation:permission-granted', payload => {
    logLine('dictation_permission_granted', payload)
    broadcastDictationLifecycle('dictation:permission-granted', payload)
  })
  manager.on('dictation:permission-denied', payload => {
    logLine('dictation_permission_denied', payload)
    broadcastDictationLifecycle('dictation:permission-denied', payload)
  })
  manager.on('dictation:permission-cleared', payload => {
    logLine('dictation_permission_cleared', payload)
    broadcastDictationLifecycle('dictation:permission-cleared', payload)
  })
  manager.on('dictation:permission-denied', payload => {
    if (payload.reason === 'listener_failed') {
      broadcastDictationLifecycle('dictation:listener-fallback', payload)
    }
  })
  createAppMenu()
  await createMainWindow()
  try {
    await checkForUpdates()
  } catch (e) {
    logLine('update_check_error', e.message)
  }
  updateInterval = setInterval(() => {
    checkForUpdates().catch(err => logLine('update_check_error', err.message))
  }, CHECK_INTERVAL_MS)
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
  try {
    if (dictationManager) {
      dictationManager.dispose().catch(err => logLine('dictation_manager_dispose_error', err.message))
    }
  } catch (error) {
    logLine('dictation_manager_dispose_error', error.message)
  }
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
})

// IPC for renderer to get backend info
ipcMain.handle('get-backend-info', async () => backendInfo)
ipcMain.on('get-backend-info-sync', (event) => {
  event.returnValue = backendInfo
})

ipcMain.handle('dictation:get-settings', async () => {
  try {
    const settings = dictationSettings.loadSettings({ forceRefresh: !dictationSettingsReady })
    dictationSettingsReady = true
    logLine('dictation_settings_get', settings)
    return settings
  } catch (error) {
    logLine('dictation_settings_get_error', error.message)
    throw error
  }
})

ipcMain.handle('dictation:set-settings', async (_event, payload = {}) => {
  try {
    const updated = dictationSettings.saveSettings(payload)
    dictationSettingsReady = true
    logLine('dictation_settings_set', updated)
    await syncDictationManager(updated)
    BrowserWindow.getAllWindows().forEach((win) => {
      try {
        win.webContents.send('dictation:settings-updated', updated)
      } catch (notifyError) {
        logLine('dictation_settings_notify_error', notifyError.message)
      }
    })
    return updated
  } catch (error) {
    logLine('dictation_settings_set_error', error.message)
    throw error
  }
})

ipcMain.handle('dictation:permission-response', async (_event, payload = {}) => {
  try {
    const { requestId, granted, reason } = payload || {}
    const manager = getDictationManager()
    if (requestId === undefined || requestId === null) {
      logLine('dictation_permission_response_missing_request', payload)
      return { ok: false, message: 'missing_request_id' }
    }
    if (typeof granted !== 'boolean') {
      logLine('dictation_permission_response_invalid_flag', payload)
      return { ok: false, message: 'invalid_granted_flag' }
    }
    if (granted) {
      const ok = manager.grantPermission({ requestId, source: 'renderer' })
      if (!ok) {
        logLine('dictation_permission_response_no_pending', { requestId, granted })
      }
      return ok ? { ok: true } : { ok: false, message: 'no_pending_request' }
    }
    const ok = manager.denyPermission({ requestId, reason: reason || 'renderer_denied' })
    if (!ok) {
      logLine('dictation_permission_response_no_pending', { requestId, granted })
    }
    return ok ? { ok: true } : { ok: false, message: 'no_pending_request' }
  } catch (error) {
    logLine('dictation_permission_response_error', error.message)
    return { ok: false, message: error.message }
  }
})

ipcMain.handle('open-update-download', async () => {
  const manifest = getLatestManifest()
  if (!manifest || !manifest.downloadUrl) {
    const error = new Error('No update download URL available')
    logLine('update_open_error', error.message)
    throw error
  }

  try {
    const parsed = new URL(manifest.downloadUrl)
    const allowedHost = 'github.com'
    if (parsed.protocol !== 'https:' || parsed.hostname !== allowedHost) {
      throw new Error(`Blocked download URL: ${parsed.toString()}`)
    }

    await shell.openExternal(parsed.toString())
    logLine('update_open_launch', parsed.toString())
    return { ok: true }
  } catch (error) {
    logLine('update_open_error', error.message)
    throw error
  }
})
function getDictationManager() {
  if (!dictationManager) {
    dictationManager = new DictationManager({
      logger: (level, message, meta) => {
        try {
          logLine(`dictation_manager_${level}`, message, meta || {})
        } catch (_) {}
      },
    })
  }
  return dictationManager
}
function broadcastDictationLifecycle(eventName, payload) {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((win) => {
    try {
      win.webContents.send('dictation:lifecycle', { event: eventName, payload })
    } catch (error) {
      logLine('dictation_lifecycle_broadcast_error', error.message)
    }
  })
}

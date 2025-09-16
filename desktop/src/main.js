const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

// Read frontend port from root config.js (best-effort)
function getFrontendPort() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require('../../config.js')
    if (cfg && cfg.FRONTEND_PORT) return cfg.FRONTEND_PORT
  } catch (_) {}
  return 3000
}

const isDev = process.env.ELECTRON_START_URL || process.env.NODE_ENV === 'development'
const FRONTEND_PORT = getFrontendPort()

let mainWindow = null

function createMainWindow() {
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
  // In production, load from packaged resources
  const prodIndex = path.join(process.resourcesPath, 'frontend_dist', 'index.html')

  const loadTarget = isDev ? devUrl : `file://${prodIndex}`

  mainWindow.once('ready-to-show', () => mainWindow && mainWindow.show())
  mainWindow.loadURL(loadTarget)

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

function createAppMenu() {
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


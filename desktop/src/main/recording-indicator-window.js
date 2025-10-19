const { BrowserWindow } = require('electron')
const path = require('path')

let indicatorWindow = null
let lastVisible = false
let lastMode = 'recording'

const INDICATOR_SIZE = { width: 220, height: 56 }

function ensureWindow() {
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    return indicatorWindow
  }

  indicatorWindow = new BrowserWindow({
    width: INDICATOR_SIZE.width,
    height: INDICATOR_SIZE.height,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    acceptFirstMouse: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  indicatorWindow.setIgnoreMouseEvents(true, { forward: true })
  const htmlPath = path.join(__dirname, 'recording-indicator.html')
  indicatorWindow.loadFile(htmlPath).catch(error => {
    // eslint-disable-next-line no-console
    console.error('Failed to load indicator window', error)
  })
  return indicatorWindow
}

function hideWindow() {
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    indicatorWindow.hide()
    lastVisible = false
  }
}

function updateIndicator({ visible, mode = 'recording', position }) {
  const win = ensureWindow()
  lastMode = mode

  if (!visible) {
    hideWindow()
    return
  }

  const targetX = position && typeof position.x === 'number' ? position.x : null
  const targetY = position && typeof position.y === 'number' ? position.y : null

  if (targetX !== null && targetY !== null) {
    const x = Math.max(Math.round(targetX - INDICATOR_SIZE.width / 2), 0)
    const y = Math.max(Math.round(targetY - INDICATOR_SIZE.height - 24), 0)
    win.setPosition(x, y, false)
  }

  if (!lastVisible) {
    win.showInactive()
    lastVisible = true
  }

  if (win && !win.isDestroyed()) {
    const script = `window.updateIndicator && window.updateIndicator(${JSON.stringify({ mode })});`
    win.webContents.executeJavaScript(script).catch(() => {})
  }
}

function destroyWindow() {
  if (indicatorWindow) {
    try {
      indicatorWindow.destroy()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to destroy indicator window', error)
    }
    indicatorWindow = null
    lastVisible = false
  }
}

module.exports = {
  updateIndicator,
  hideWindow,
  destroyWindow,
}

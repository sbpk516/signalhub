const { contextBridge, ipcRenderer } = require('electron')

// Minimal, safe bridge
// Expose minimal, safe API
const backendInfoSync = (() => {
  try {
    return ipcRenderer.sendSync('get-backend-info-sync') || {}
  } catch (_) {
    return {}
  }
})()

contextBridge.exposeInMainWorld('api', {
  ping: () => 'pong',
  getBackendInfo: () => ipcRenderer.invoke('get-backend-info'),
  backend: backendInfoSync,
})

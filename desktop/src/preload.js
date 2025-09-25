const { contextBridge, ipcRenderer } = require('electron')

const UPDATE_EVENT = 'update-available'
const updateListeners = new Set()
let latestManifest = null

ipcRenderer.on(UPDATE_EVENT, (_event, manifest) => {
  latestManifest = manifest
  try {
    console.log('[Preload] update available', manifest)
  } catch (_) {}
  updateListeners.forEach((listener) => {
    try {
      listener(manifest)
    } catch (error) {
      console.error('[Preload] update listener failed', error)
    }
  })
})

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

contextBridge.exposeInMainWorld('signalhubUpdates', {
  onAvailable(callback) {
    if (typeof callback !== 'function') {
      console.warn('[Preload] onAvailable expects a function callback')
      return () => {}
    }
    updateListeners.add(callback)
    if (latestManifest) {
      try {
        callback(latestManifest)
      } catch (error) {
        console.error('[Preload] immediate update callback failed', error)
      }
    }
    return () => updateListeners.delete(callback)
  },
  getLatestManifest() {
    return latestManifest
  },
  openDownload() {
    if (!latestManifest || !latestManifest.downloadUrl) {
      console.warn('[Preload] openDownload called without a manifest')
      return Promise.reject(new Error('No manifest available for download'))
    }
    return ipcRenderer.invoke('open-update-download').catch((error) => {
      console.error('[Preload] Failed to launch update download', error)
      throw error
    })
  },
})

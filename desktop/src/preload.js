const { contextBridge, ipcRenderer } = require('electron')

const UPDATE_EVENT = 'update-available'
const DICTATION_SETTINGS_EVENT = 'dictation:settings-updated'

const updateListeners = new Set()
const dictationSettingsListeners = new Set()
const dictationLifecycleListeners = new Set()
const dictationPermissionListeners = new Set()

let latestManifest = null
let latestDictationSettings = null
let latestLifecycleEvent = null
let latestPermissionRequest = null

ipcRenderer.on('dictation:lifecycle', (_event, eventData) => {
  latestLifecycleEvent = eventData
  const lifecycleEvent = eventData && eventData.event
  const lifecyclePayload = eventData && eventData.payload
  if (lifecycleEvent === 'dictation:permission-required') {
    latestPermissionRequest = lifecyclePayload || null
    dictationPermissionListeners.forEach((listener) => {
      try {
        listener({ type: lifecycleEvent, payload: lifecyclePayload })
      } catch (error) {
        console.error('[Preload] dictation permission listener failed', error)
      }
    })
  } else if (
    lifecycleEvent === 'dictation:permission-granted' ||
    lifecycleEvent === 'dictation:permission-denied' ||
    lifecycleEvent === 'dictation:permission-cleared' ||
    lifecycleEvent === 'dictation:listener-fallback'
  ) {
    latestPermissionRequest = null
    dictationPermissionListeners.forEach((listener) => {
      try {
        listener({ type: lifecycleEvent, payload: lifecyclePayload })
      } catch (error) {
        console.error('[Preload] dictation permission listener failed', error)
      }
    })
  }
  dictationLifecycleListeners.forEach((listener) => {
    try {
      listener(eventData)
    } catch (error) {
      console.error('[Preload] dictation lifecycle listener failed', error)
    }
  })
})

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

ipcRenderer.on(DICTATION_SETTINGS_EVENT, (_event, settings) => {
  latestDictationSettings = settings
  dictationSettingsListeners.forEach((listener) => {
    try {
      listener(settings)
    } catch (error) {
      console.error('[Preload] dictation settings listener failed', error)
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

contextBridge.exposeInMainWorld('signalhubDictation', {
  async getSettings() {
    try {
      const settings = await ipcRenderer.invoke('dictation:get-settings')
      latestDictationSettings = settings
      return settings
    } catch (error) {
      console.error('[Preload] Failed to get dictation settings', error)
      throw error
    }
  },
  async updateSettings(patch) {
    try {
      const settings = await ipcRenderer.invoke('dictation:set-settings', patch)
      latestDictationSettings = settings
      return settings
    } catch (error) {
      console.error('[Preload] Failed to update dictation settings', error)
      throw error
    }
  },
  onSettingsUpdated(callback) {
    if (typeof callback !== 'function') {
      console.warn('[Preload] onSettingsUpdated expects a function callback')
      return () => {}
    }
    dictationSettingsListeners.add(callback)
    if (latestDictationSettings) {
      try {
        callback(latestDictationSettings)
      } catch (error) {
        console.error('[Preload] immediate dictation callback failed', error)
      }
    }
    return () => dictationSettingsListeners.delete(callback)
  },
  getCachedSettings() {
    return latestDictationSettings
  },
  onLifecycle(callback) {
    if (typeof callback !== 'function') {
      console.warn('[Preload] onLifecycle expects a function callback')
      return () => {}
    }
    dictationLifecycleListeners.add(callback)
    if (latestLifecycleEvent) {
      try {
        callback(latestLifecycleEvent)
      } catch (error) {
        console.error('[Preload] immediate lifecycle callback failed', error)
      }
    }
    return () => dictationLifecycleListeners.delete(callback)
  },
  getLatestLifecycle() {
    return latestLifecycleEvent
  },
  onPermissionRequired(callback) {
    if (typeof callback !== 'function') {
      console.warn('[Preload] onPermissionRequired expects a function callback')
      return () => {}
    }
    dictationPermissionListeners.add(callback)
    if (latestPermissionRequest) {
      try {
        callback({ type: 'dictation:permission-required', payload: latestPermissionRequest })
      } catch (error) {
        console.error('[Preload] immediate permission callback failed', error)
      }
    }
    return () => dictationPermissionListeners.delete(callback)
  },
  getLatestPermissionRequest() {
    return latestPermissionRequest
  },
  async respondPermission(response) {
    try {
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid permission response payload')
      }
      return await ipcRenderer.invoke('dictation:permission-response', response)
    } catch (error) {
      console.error('[Preload] Failed to send permission response', error)
      throw error
    }
  },
})

const { contextBridge } = require('electron')

// Minimal, safe bridge
contextBridge.exposeInMainWorld('api', {
  ping: () => 'pong',
})


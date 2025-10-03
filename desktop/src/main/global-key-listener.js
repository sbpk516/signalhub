"use strict"

let Factory = null

function createGlobalKeyListenerFactory() {
  if (Factory) {
    return Factory
  }
  try {
    // eslint-disable-next-line global-require
    Factory = require("node-global-key-listener").GlobalKeyboardListener
  } catch (error) {
    const err = new Error("node-global-key-listener unavailable")
    err.cause = error
    throw err
  }
  return Factory
}

module.exports = {
  createGlobalKeyListenerFactory,
}

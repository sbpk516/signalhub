SignalHub Desktop (Electron) – Phase Plan

This document captures the agreed plan to build desktop apps for macOS and Windows using Electron, electron-builder, and electron-updater, with GitHub Releases for distribution.

Phases
- Phase 1 (Unsigned MVP):
  - Wire Electron shell to load the existing React/Vite build
  - Secure preload (contextIsolation), no nodeIntegration
  - Local packaging via electron-builder (DMG/NSIS), unsigned
- Phase 2 (Auto-Update & Publish):
  - Integrate electron-updater
  - Publish artifacts via GitHub Releases with CI
- Phase 3 (Signing & CI Production):
  - macOS signing + notarization
  - Windows code signing + timestamping

Planned Files (to be added when implementing)
- desktop/package.json (Electron deps, scripts)
- desktop/electron-builder.yml (packaging config)
- desktop/src/main.ts (Electron main process)
- desktop/src/preload.ts (secure bridge)
- desktop/src/menu.ts (app menu)
- desktop/src/autoUpdater.ts (auto-update wiring)
- desktop/tsconfig.json (if using TypeScript)
- desktop/assets/ (icons)


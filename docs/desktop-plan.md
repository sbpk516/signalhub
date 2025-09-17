SignalHub Desktop (Electron) – Phase Plan

This document captures the agreed plan to build desktop apps for macOS and Windows using Electron, electron-builder, and electron-updater, with GitHub Releases for distribution.

Phases
- Phase 0: Prep
  - Verify backend/frontend startup scripts are reliable
  - Document desktop plan and link from README
  - Decide JS vs TS for Electron (start with JS)
  - Begin code‑signing requests (Apple/Windows) in parallel
- Phase 1: Unsigned MVP (Dev Integration)
  - Electron loads Vite dev server (http://localhost:3000)
  - Secure preload (contextIsolation), no nodeIntegration, minimal `window.api`
  - Minimal app menu; DevTools enabled in dev
- Phase 1.1: Production Load (Local, Unsigned)
  - Package app with electron‑builder and bundle `frontend/dist`
  - Load `file://…/frontend_dist/index.html` in production
  - Smoke test UI (API calls added in 1.2)
- Phase 1.2: API Base URL in Packaged App
  - Detect packaged mode and use absolute API base URL
  - Keep relative URLs in dev so Vite proxy works
- Phase 2: Auto‑Update & Publish
  - Integrate electron‑updater; add “Check for Updates”
  - Configure GitHub Releases (draft/prerelease while testing)
  - Add update event logging and basic UX
- Phase 3: Signing & CI Production
  - macOS Developer ID signing + notarization + stapling
  - Windows code signing (OV/EV) + timestamp
  - GitHub Actions matrix build, sign, and publish

Planned Files (to be added when implementing)
- desktop/package.json (Electron deps, scripts)
- desktop/electron-builder.yml (packaging config)
- desktop/src/main.ts (Electron main process)
- desktop/src/preload.ts (secure bridge)
- desktop/src/menu.ts (app menu)
- desktop/src/autoUpdater.ts (auto-update wiring)
- desktop/tsconfig.json (if using TypeScript)
- desktop/assets/ (icons)

Detailed Development Plan (Debug‑First)

Assumptions
- Frontend dev server on port 3000; backend on 8001 (config.js)
- Updates hosted via GitHub Releases
- Monorepo with `desktop/` alongside `frontend/`

Phase 0: Prep
- Goal: be ready to iterate safely and test quickly
- Tasks:
  - Confirm `scripts/clear-ports.sh` and backend start scripts work reliably
  - Keep DevTools/logging on by default during development
  - Start code‑signing procurement (Apple Developer ID, Windows cert)
- Validation:
  - Backend health endpoint responds
  - No lingering ports after cleanup

Phase 1: Unsigned MVP (Dev Integration)
- Goal: run Electron against Vite dev server
- Tasks:
  - `desktop npm run dev` starts Vite and Electron (wait‑on 3000)
  - `BrowserWindow` with secure defaults; DevTools in dev
  - `preload` exposes `window.api.ping()`
  - Minimal menu (About/Quit; DevTools)
- Validate:
  - Electron window loads app from http://localhost:3000
  - Results page hits backend; sort toggle works; logs show first/last timestamps
  - `window.api.ping()` returns `"pong"`

Phase 1.1: Production Load (Local, Unsigned)
- Goal: load packaged renderer from file://
- Tasks:
  - Build renderer: `frontend/dist`
  - Electron loads `file://…/frontend_dist/index.html`
  - Package with electron‑builder (DMG/NSIS)
- Validate:
  - Unsigned installer runs; UI renders

Phase 1.2: API Base URL in Packaged App
- Goal: API works in packaged app
- Tasks:
  - In axios client, detect `file:` protocol and set absolute base URL (http://127.0.0.1:8001)
  - Keep dev using relative URLs for Vite proxy
- Validate:
  - Packaged app loads Results/Uploads successfully

Phase 2: Auto‑Update & Publish (Draft/Prerelease)
- Goal: app can update itself
- Tasks:
  - Integrate electron‑updater; add simple UI and logs
  - Configure GitHub Releases provider; publish draft/prerelease artifacts
  - Manual test update path v0.1.0 → v0.1.1
- Validate:
  - Update events logged; app restarts on update

Phase 3: Signing & CI/CD
- Goal: trusted installers via CI
- Tasks:
  - macOS: Developer ID signing, notarization, stapling
  - Windows: Code signing (OV/EV), timestamp
  - GitHub Actions matrix builds, signs, and publishes
- Validate:
  - macOS `spctl` ok; Windows signature verified; auto‑update still works

Phase 4: Hardening & Diagnostics
- Goal: secure and supportable app
- Tasks:
  - Disable remote module; strict CSP; restricted IPC
  - `electron-log` with rotating files; Diagnostics menu (Copy logs / Health check)
  - Optional crash reporting (Sentry)
- Validate:
  - Health check predictable; logs contain needed diagnostics without PII


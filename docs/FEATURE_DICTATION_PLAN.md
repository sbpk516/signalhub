# Press-and-Hold Dictation Feature Plan

## Impact Analysis

- **New files**
  - `desktop/src/main/dictation-manager.js` – owns `iohook` registration, press/hold lifecycle, permission gating, IPC messaging, feature toggle state.
  - `frontend/src/modules/dictation/dictationController.ts` – renderer hook that records audio, calls new backend endpoint, performs caret insertion, manages overlay state.
  - `frontend/src/modules/dictation/dictationOverlay.tsx` – React portal component for “Listening…” / “Processing…” UI.
  - `frontend/src/modules/dictation/permissionPrompt.tsx` – lightweight dialog to explain mic permission when needed.
  - `backend/app/api/dictation.py` (new FastAPI router) – single-call transcription endpoint.
  - `desktop/src/config/dictation-store.json` (created at runtime) – persists enable/disable + shortcut preference.

- **Existing files to modify**
  - `desktop/package.json` – add `iohook` dependency and build scripts.
  - `desktop/src/main.js` – initialize and shut down dictation manager; surface feature flag via IPC.
  - `desktop/src/preload.js` – expose dictation events (`onDictationStart`, `onDictationStop`, `onDictationResult`, etc.), commands (`requestDictationToggle`, `fetchDictationState`), and permission helper.
  - `frontend/src/main.tsx` (or `App.tsx`) – bootstrap dictation controller/overlay.
  - `frontend/src/components/Settings/` – add toggle UI (enable/disable, shortcut display).
  - `backend/app/main.py` – register new dictation router.
  - `backend/app/whisper_processor.py` – add helper for short-form transcription (if needed).
  - Docs: `README.md`, `PHASE_1.3_IMPLEMENTATION_STRATEGY.md`, changelog.

- **Dependencies / Configuration**
  - Add `iohook` (desktop) for system-wide keyboard hook; document build considerations.
  - Introduce `DICTATION_SHORTCUT` default (for example, `CommandOrControl+Shift+D`) stored in config JSON; toggle state persisted per user (default off).
  - Backend: no new external dependencies; reuse Whisper + FFmpeg.

## Step-by-Step Task Breakdown

- [x] **Task 1** – Feature Flag & Config Foundation
  - Introduce dictation enable flag and shortcut default. Implement JSON store under `app.getPath('userData')/dictation-settings.json` with load/save helpers. Expose IPC handlers (`getDictationSettings`, `setDictationSettings`). Toggle defaults to disabled.
- [ ] **Task 2** – System Hook Integration Scaffold
  - Add `iohook` dependency and wrap it in `dictation-manager.js` to capture configured shortcut regardless of app focus. Register on app ready only if the feature is enabled; ensure safe teardown on quit, handle macOS accessibility permission warnings in logs.
- [ ] **Task 3** – Permission Flow & Notification IPC
  - In dictation manager, on key press emit `dictation:request-start`. If mic permission is unknown, bring window to foreground, notify renderer (`dictation:permission-required`), and wait for confirmation before recording.
- [ ] **Task 4** – Backend Single-Call Endpoint
  - Create `POST /api/v1/dictation/transcribe` that accepts a short audio payload, runs Whisper `transcribe_snippet`, and returns `{ text, confidence, duration_ms }`. Validate payload size/duration, add structured logging, and unit tests with mocked processor.
- [ ] **Task 5** – Renderer Dictation Controller (Recording Pipeline)
  - Build controller that on `dictation:request-start` requests mic access, starts `MediaRecorder`, buffers audio, and on release posts to the new endpoint. Handle timeouts and surface success/error via IPC.
- [ ] **Task 6** – Overlay & Feedback UI
  - Implement portal overlay showing “Listening…” while recording and “Processing…” until transcription completes. Include accessible aria-live messaging and ensure visibility when the window is foregrounded for permissions.
- [ ] **Task 7** – Intelligent Text Insertion Utility
  - Add helper to locate the active element, insert returned text at the caret with whitespace normalization, and fall back to clipboard paste if focus is lost. Include unit tests where feasible.
- [ ] **Task 8** – Settings Toggle UI & IPC Wiring
  - Add toggle in Settings (“Press-and-Hold Dictation”) with status indicator and shortcut display. Wire to preload IPC to enable/disable the manager at runtime, and include conflict warnings.
- [ ] **Task 9** – Error Handling & Edge Conditions
  - Implement user-facing toast/banner for errors (permission denied, backend failure, timeout). Add recovery logic and detailed logging; disable feature after repeated fatal errors.
- [ ] **Task 10** – Documentation & QA Checklist
  - Update docs with setup instructions (accessibility permission for iohook, mic permissions, shortcut management). Produce manual testing guide covering all scenarios.
- [ ] **Task 11** – Validation & Regression Pass
  - Run desktop and backend test suites, lint/type-check, and perform manual smoke tests on supported OSes verifying system-wide shortcut, permission flow, and text insertion.

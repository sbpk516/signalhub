# Press-and-Hold Dictation Feature Plan

## Impact Analysis

- **New files**
  - `desktop/src/main/dictation-manager.js` – owns `@nut-tree/nut-js` registration, press/hold lifecycle, permission gating, IPC messaging, feature toggle state.
  - `frontend/src/modules/dictation/dictationController.ts` – renderer hook that records audio, calls new backend endpoint, performs caret insertion, manages overlay state.
  - `frontend/src/modules/dictation/dictationOverlay.tsx` – React portal component for “Listening…” / “Processing…” UI.
  - `frontend/src/modules/dictation/permissionPrompt.tsx` – lightweight dialog to explain mic permission when needed.
  - `backend/app/api/dictation.py` (new FastAPI router) – single-call transcription endpoint.
  - `desktop/src/config/dictation-store.json` (created at runtime) – persists enable/disable + shortcut preference.

- **Existing files to modify**
  - `desktop/package.json` – add `@nut-tree/nut-js` dependency and build scripts.
  - `desktop/src/main.js` – initialize and shut down dictation manager; surface feature flag via IPC.
  - `desktop/src/preload.js` – expose dictation events (`onDictationStart`, `onDictationStop`, `onDictationResult`, etc.), commands (`requestDictationToggle`, `fetchDictationState`), and permission helper.
  - `frontend/src/main.tsx` (or `App.tsx`) – bootstrap dictation controller/overlay.
  - `frontend/src/components/Settings/` – add toggle UI (enable/disable, shortcut display).
  - `backend/app/main.py` – register new dictation router.
  - `backend/app/whisper_processor.py` – add helper for short-form transcription (if needed).
  - Docs: `README.md`, `PHASE_1.3_IMPLEMENTATION_STRATEGY.md`, changelog.

- **Dependencies / Configuration**
  - Use `@nut-tree-fork/nut-js` for programmatic typing/caret control; pair with `node-global-key-listener` for global key press/release hooks. Both require native modules rebuilt via `electron-rebuild` for dev and packaging pipelines.
  - Introduce `DICTATION_SHORTCUT` default (for example, `CommandOrControl+Shift+D`) stored in config JSON; toggle state persisted per user (default off).
  - Document and prompt for macOS Accessibility permissions required by the global key listener/nut-js pairing; capture Windows/Linux prerequisites (admin rights, uinput availability).
  - Backend: no new external dependencies; reuse Whisper + FFmpeg.
  
## Step-by-Step Task Breakdown

- [x] **Task 1** – Feature Flag & Config Foundation
  - Introduce dictation enable flag and shortcut default. Implement JSON store under `app.getPath('userData')/dictation-settings.json` with load/save helpers. Expose IPC handlers (`getDictationSettings`, `setDictationSettings`). Toggle defaults to disabled.
- [ ] **Task 2** – System Shortcut Integration Scaffold
  - [x] Lazy-load `@nut-tree-fork/nut-js`, cache keyboard handles, and guard startup when the dependency fails.
    - [x] Verify main-process bootstrap succeeds and records failure reasons when the dependency is missing.
  - [x] Parse accelerator strings into nut-js key sequences with platform-aware token normalization.
    - [x] Normalize modifier aliases (Command/Ctrl/Alt/etc.) and reject unsupported tokens with structured logging.
  - [x] Introduce global key listener provider and ensure proper teardown on stop/dispose.
    - [x] Install `node-global-key-listener`, wire `electron-rebuild` postinstall, and document native build requirements for CI/dev environments.
    - [x] Map listener key codes to nut-js `Key` enums with a tested translation helper (letters, digits, modifiers, function keys).
    - [x] Bind keydown/keyup handlers using listener subscriptions; retain handles for cleanup and resilience after reloads.
    - [x] Detach listener subscriptions on `stopListening`, feature toggle changes, and `dispose` to prevent duplicate events or leaks.
  - [ ] Surface press-and-hold lifecycle details (logging, IPC wiring, permission checks) once listeners are active.
    - [x] Implement internal press/hold state machine and emit start/end/cancel lifecycle events.
    - [x] Add structured logging/tracing around lifecycle emissions, including debounce decisions and cancellation reasons.
    - [x] Forward lifecycle notifications to renderer via IPC; expose preload APIs and guard behind feature toggle state.the remaining piece is the permission gating, which belongs to Task 3.
    - [x] Validation checkpoint: automated coverage exercising press/hold/release lifecycle and listener teardown.
- [ ] **Task 3** – Permission Flow & Notification IPC
  - [x] In dictation manager, on key press emit `dictation:request-start`; if permission is unknown, notify renderer (`dictation:permission-required`) and wait for confirmation before recording.
  - [x] Implement macOS Accessibility/microphone checks (via `node-mac-permissions`), surface renderer prompts with retry/learn-more options, and log denial.
  - [x] Document Windows/Linux prerequisites (admin rights, uinput) via fallback messaging when listener initialization fails.
  - [x] Validation checkpoint: simulate denied permissions to confirm auto-disable behaviour and cancel flow.
  - [ ] Documentation note: Update README/desktop docs with macOS permission steps and Windows/Linux prerequisites once UI wiring is complete (tracked under Task 10).
- [ ] **Task 4** – Backend Single-Call Endpoint
  - [x] Create `POST /api/v1/dictation/transcribe` that accepts a short audio payload, runs Whisper `transcribe_snippet`, and returns `{ text, confidence, duration_ms }`. Validate payload size/duration, add structured logging, correlation IDs, and unit tests with mocked processor.
  - [x] Ensure endpoint is feature-flag gated and returns clear error codes for unsupported audio or transcription failures. (_Tests added; execution blocked in sandbox due to Whisper warmup_)
- [ ] **Task 5** – Renderer Dictation Controller (Recording Pipeline)
  - [x] Scaffold controller hook/provider to listen to permission + lifecycle events.
  - [x] Build controller that on `dictation:request-start` requests mic access, starts `MediaRecorder`, buffers audio, and on release posts to the new endpoint. Handle timeouts and surface success/error via IPC.
    - [x] Enforce backend payload limit (5 MB) when packaging snippets; surface a “too large” error before upload.
    - [x] Launch uploads via retry/backoff helper with user-cancel/timeout classification and abort cleanup.
  - [x] Add retry/backoff strategy for transient backend failures and a watchdog for recordings exceeding max duration.
  - [x] Validation checkpoint: automated test packaging MediaRecorder-style chunks and enforcing snippet limits.
- [ ] **Task 6** – Overlay & Feedback UI
  - [x] Implement portal overlay showing “Listening…” while recording and “Processing…” until transcription completes. Include accessible aria-live messaging, keyboard focus management, and ensure visibility when the window is foregrounded for permissions.
  - [x] Provide explicit cues for permission-required state and recovery instructions.
- [x] **Task 7** – Intelligent Text Insertion Utility
  - [x] Add helper to locate the active element, insert returned text at the caret with whitespace normalization, and fall back to clipboard paste if focus is lost. Leverage `@nut-tree-fork/nut-js` to programmatically type the transcribed text into external applications. Include unit tests where feasible.
  - [x] Separate internal renderer insertion (React components) from external app typing via nut-js; handle localization (e.g., newline handling) and clipboard rollback on failure.
- [ ] **Task 8** – Settings Toggle UI & IPC Wiring
  - Add toggle in Settings (“Press-and-Hold Dictation”) with status indicator and shortcut display. Wire to preload IPC to enable/disable the manager at runtime, and include conflict warnings.
  - Provide onboarding tips (first-run tooltip, link to permissions guide) and shortcut validation against Electron/globalShortcut conflicts.
  - Persist config versioning for future migrations and expose “restore defaults” action.
- [ ] **Task 9** – Error Handling & Edge Conditions
  - Implement user-facing toast/banner for errors (permission denied, backend failure, timeout). Add recovery logic and detailed logging; disable feature after repeated fatal errors.
  - Detect stuck-key scenarios (missing keyup) and auto-reset listener state with user notification.
  - Provide safe-mode toggle to re-enable feature after corrective action; log correlation IDs to desktop log for support.
- [ ] **Task 10** – Documentation & QA Checklist
  - Update docs with setup instructions (including granting macOS Accessibility permissions required by global listener/nut-js, mic permissions, shortcut management). Produce manual testing guide covering all scenarios.
  - Add troubleshooting section (permission denial, antivirus conflicts, stuck keys), onboarding copy, and known limitations per platform.
  - Document packaging/build changes (electron-rebuild step, CI requirements, notarization considerations).
- [ ] **Task 11** – Validation & Regression Pass
  - Run desktop and backend test suites, lint/type-check, and perform manual smoke tests on supported OSes verifying system-wide shortcut, permission flow, and text insertion.
  - Ensure CI rebuilds native modules for macOS, Windows, Linux; add automated regression scripts for lifecycle events and transcription flow.
  - Final acceptance checklist: shortcut detection, permission onboarding, transcription round-trip, text insertion, error recovery, documentation links confirmed.

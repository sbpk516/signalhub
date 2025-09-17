# Project Journal

Purpose
- Running log of decisions, approaches, issues, and outcomes for this project.
- Use the guide at `docs/journal/JOURNAL_GUIDE.md` for how to write entries.

Index
- 2025-09-17 – Desktop packaging: white screen fix, offline transcription

---

## 2025-09-17 – Desktop packaging: white screen fix, offline transcription

- Date: 2025-09-17
- Phase/Milestone: Desktop app packaging stability
- Goal: Fix white screen on launch and restore transcription in packaged app.
- Context: Packaged app showed a blank window; dev worked. Transcription missing after merge when running packaged binary.
- Options considered:
  - A) Repoint renderer to use relative assets via `--base=./` (quick, low risk) – chosen for white screen.
  - B) Ship Whisper/Torch in backend binary and bundle an offline model (base/tiny) – chosen for transcription.
  - C) Allow runtime model downloads – rejected (network‑dependent, brittle for offline).
- Chosen approach & rationale:
  - Build frontend with `--base=./` and verify `./assets` in `index.html`.
  - Rebuild backend with PyInstaller including Whisper/Torch and bundle `base.pt` under a fixed cache path for offline use.
- Implementation summary:
  - Frontend: use `npm run build:electron` for relative paths.
  - Desktop: add `whisper_cache` to `extraResources`; set `XDG_CACHE_HOME` to bundled cache.
  - Prepack check: script validates assets, backend binary, and model presence before packaging.
  - Fix copy icon URL to respect Vite base (`import.meta.env.BASE_URL`).
- Issues/Risks:
  - Large artifact sizes when bundling models; mitigated by allowing tiny/base choice later.
  - Dev vs packaged behavior drift; mitigated by prepack checks and docs.
- Validation:
  - Verified `frontend_dist/index.html` uses `./assets`.
  - Packaged `.app` includes `whisper_cache/whisper/base.pt`.
  - App launches, health OK, new audio uploads transcribe successfully.
- Outcome:
  - White screen resolved; transcription restored offline.
- Follow‑ups:
  - Optional: diagnostics page; model selection UI (tiny/base); app icons.
- Lessons learned:
  - Always enforce relative assets in Electron builds.
  - Bundle offline model or clearly document/permit download path.
- Links:
  - Prepack script: `scripts/check-prepack.sh`
  - Packaging: `desktop/electron-builder.yml`, `desktop/src/main.js`
  - Copy icon fix: `frontend/src/pages/Results.tsx`


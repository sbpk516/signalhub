# Project Journal

Purpose
- Running log of decisions, approaches, issues, and outcomes for this project.
- Use the guide at `docs/journal/JOURNAL_GUIDE.md` for how to write entries.

Index
- 2025-09-17 – Desktop packaging: white screen fix, offline transcription
- 2025-09-19 – Transcription reliability (short clips), dashboard health, friendlier reanalyze

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

---

## 2025-09-19 – Transcription reliability (short clips), dashboard health, friendlier reanalyze

- Date: 2025-09-19
- Phase/Milestone: Pipeline quality + Desktop parity
- Goal: Eliminate empty transcripts on short clips; avoid false “Backend not ready”; return friendly reanalyze message.

Context
- Some short/clean English clips produced empty transcripts (text_len=0) even when transcription_success=True.
- Dashboard occasionally showed “Backend not ready” despite backend being healthy (desktop uses dynamic port).
- Reanalyze returned 400 when transcript text was empty; UX preferred a friendly 200.

Changes implemented
- Transcription robustness
  - Convert uploads to mono 16 kHz WAV before Whisper; pass converted path to STT.
  - Force English by default in desktop mode; relaxed thresholds for short clips (temperature=0.0; condition_on_previous_text=false; no_speech_threshold=0.3).
  - Files: `backend/app/pipeline_orchestrator.py:462`, `backend/app/whisper_processor.py:28`, `backend/app/whisper_processor.py:95`, `backend/app/whisper_processor.py:112`, `backend/app/whisper_processor.py:212`.
- Dashboard health
  - When running under file:// (desktop), fetch health from `http://127.0.0.1:${window.api.backend.port}/health` instead of `/health` (web dev).
  - File: `frontend/src/pages/Dashboard.tsx:23`, `frontend/src/pages/Dashboard.tsx:57`.
- Reanalyze UX
  - Return 200 with `{ message: "No transcript available" }` when transcript text is empty.
  - File: `backend/app/main.py:505`.
- Repo hygiene
  - Expanded `.gitignore` to exclude backend builds, desktop artifacts, local audio, and runtime data.

Current status
- Desktop
  - “Backend not ready” banner now disappears once health is OK; a brief flash at startup is expected while backend warms up.
  - Packaged app includes backend binary + offline Whisper model; runs on an ephemeral port if 8001/8011/8021 are busy.
- Pipeline
  - Conversion to mono 16 kHz + forced English reduces empty outputs on short clips; some micro‑clips may still produce empty text.
  - Reanalyze now returns 200 with message instead of 400 when transcript text is empty.

Repro steps (web dev for fast loop)
- Backend (port 8001)
  - `source venv/bin/activate`
  - `export SIGNALHUB_ENABLE_TRANSCRIPTION=1`
  - `export SIGNALHUB_FORCE_LANGUAGE=en`
  - `export SIGNALHUB_MODE=desktop`
  - `uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001`
- Frontend (Vite)
  - `cd frontend && npm install && npm run dev`
  - Open `http://localhost:3000`
- Validate
  - Upload `test_files/sample_en_hello_16k.wav` and a known short clip; open the result and confirm transcript text is non‑empty.
  - If empty, Reanalyze should respond 200 with `{"message":"No transcript available"}`.

Open issues
- Some very short/quiet files still yield empty transcripts even after normalization + forced language. Need to:
  - Consider chunked transcription fallback for clips < 10s.
  - Optionally lower `no_speech_threshold` further or tweak logprob thresholds.
  - Add user‑selectable language in UI (default EN) to avoid autodetect on tiny samples.

Next steps
- Decide on chunked fallback for short clips and implement if approved.
- Add optional language selector in Upload UI; wire to API parameter.
- Optionally pin desktop backend to a fixed port (e.g., 8011) for easier debugging.
- Add a small diagnostics panel (shows backend port, health, Whisper model name).

Artifacts & evidence
- Last observed empty transcript (desktop):
  - Transcript: `~/Library/Application Support/signalhub-desktop/uploads/transcripts/2025/09/19/3e36f278-0068-45e0-bb9c-4ec0b4a63fb4_transcript.json`
  - transcription_success=True, language=unknown, text_len=0, segments_count=0.
- Desktop backend port example from logs: 57043 (ephemeral; changes per launch).

Commit
- main: `c5f7b84` – pipeline normalization, dashboard health URL fix, reanalyze message; expanded .gitignore.


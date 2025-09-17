SignalHub – Agents Guide and Approvals

Purpose
- Define how coding agents work in this repo: what they may do autonomously, when they must ask for approval, and how they report progress.
- Keep changes safe, auditable, and fast to review.

Defaults
- Mode: on‑request approvals.
- Filesystem: workspace‑write (only within this repo).
- Network: restricted; installs and downloads require approval.
- Scope: focus strictly on the task; avoid unrelated refactors.

Autonomous Actions (no approval)
- Read‑only commands: rg, ls, cat, sed -n, git status/log/blame.
- Maintain a short step‑by‑step plan and keep it updated.
- Small, focused edits via patches limited to the task (app code, tests, docs).
- Run lightweight, non‑network checks already available locally.
- Create/update docs in docs/ or root (e.g., this file), and small helper scripts in scripts/.

Requires Approval (ask first)
- Package installs: pip install, npm install, system package managers.
- Any network access (fetch artifacts, call external APIs).
- Destructive ops: delete/move many files, rewriting history, large refactors.
- Long/heavy builds that download toolchains or platform images.
- Secrets: creating/changing .env, credentials, signing keys.
- DB migrations that change persisted data or schemas.

Never Do
- Exfiltrate secrets or PII.
- Write outside the repo or user‑approved paths.
- Auto‑publish releases, sign binaries, or upload artifacts without explicit approval.

Working Style
- Preambles: before grouped commands, say what you will do in 1–2 short sentences.
- Planning: exactly one step in_progress until done.
- Patches: use apply_patch; keep diffs minimal and focused.
- Validation: prefer targeted checks (tests for changed area, /health) over whole‑repo work unless asked.
- Summaries: report outcome, files touched, next actions, and follow‑ups.

Approval Request Template
- Goal: one line describing the objective.
- Files/Areas: e.g., backend/app/*, desktop/*, frontend/src/*.
- Commands: exact commands you intend to run.
- Network/Installs: yes/no (list packages or URLs if yes).
- Risk: low/medium/high and why.
- Rollback: how to revert (e.g., revert patch, delete created files).

Common Tasks and Expected Escalations
- Backend (FastAPI):
  - Autonomy: small fixes in backend/app/*, add unit tests, local health checks.
  - Approval: pip installs/PyInstaller builds, schema changes, migrations.
- Frontend (Vite/React):
  - Autonomy: TS/JS changes in frontend/src, mock updates, local logic.
  - Approval: npm installs, adding new deps, changing build config.
- Desktop (Electron):
  - Autonomy: tweaks in desktop/src/main.js or preload.js, small menu changes.
  - Approval: electron‑builder packaging, code signing, updater config, large assets.
- Docs & Scripts:
  - Autonomy: READMEs, quick scripts under scripts/ that don’t assume privileged ops.

Environments and Variables
- Backend
  - SIGNALHUB_MODE: desktop or empty. Desktop switches DB to SQLite under data dir.
  - SIGNALHUB_PORT: backend port (default 8001).
  - SIGNALHUB_DATA_DIR: base dir for logs/uploads/DB in desktop mode.
  - DATABASE_URL: overrides DB connection (server mode).
  - SECRET_KEY: dev default used if unset.
  - SQLALCHEMY_ECHO: set 1 to echo SQL.
- Desktop
  - Electron passes SIGNALHUB_MODE/PORT/DATA_DIR to the backend binary.
- Frontend
  - Uses config.js (BACKEND_PORT, FRONTEND_PORT) and Vite env for dev.

Build and Release Guardrails
- Backend binary (PyInstaller): approval required for installs/builds.
- Desktop packaging (electron‑builder): approval required, especially for signing/notarization.
- Publishing: never upload artifacts without explicit approval and destination.

Testing & Health Checks
- Backend health: GET /health returns 200 and probes DB connectivity.
- Quick desktop run:
  - SIGNALHUB_MODE=desktop SIGNALHUB_PORT=8001 SIGNALHUB_DATA_DIR="$HOME/Library/Application Support/SignalHub" python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001
- Port hygiene: run scripts/clear-ports.sh.

Security & Secrets
- Do not commit .env, tokens, or certs.
- Redact secrets in logs and summaries.
- Use OS keychains or CI secrets for publishing (with approval).

Change Review Checklist (for agents)
- Motivation: why the change is needed.
- Scope: files touched and what changed.
- Risk: behavior changes, migrations, data impact.
- Validation: how you verified (tests, local run, /health).
- Rollback: how to revert quickly if needed.

Troubleshooting Quick Notes
- Desktop backend fails to start:
  - Check userData logs: ~/Library/Application Support/SignalHub/logs/desktop.log.
  - Ensure backend writes to SIGNALHUB_DATA_DIR (writable), not relative paths.
  - Verify /health manually on the reported port.
- Port conflicts: use the app’s health checker or lsof -i :8001.

Roadmap for Agent Automations (opt‑in)
- Lint/format pipelines with pre‑configured tools.
- Add smoke tests for /health and Results endpoints.
- Optional build‑only CI job to produce unsigned artifacts.

Ownership & Contact
- Primary areas: backend/*, frontend/*, desktop/*, docs/*.
- When unsure, assume approvals are required and ask.

User‑Preferred Plan‑First Flow
- For a higher‑level, fewer‑prompts experience, follow docs/agenda.agent.md.
- In short: present options and a recommended plan first; after approval, implement autonomously, validate, report back, and only push once the owner confirms it works.

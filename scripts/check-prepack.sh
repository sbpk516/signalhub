#!/usr/bin/env bash
set -euo pipefail

echo "[prepack] Running sanity checks..."

# Resolve repo root (script is expected to be called from desktop/ via npm)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

fail() { echo "[prepack][ERROR] $1" >&2; exit 1; }
warn() { echo "[prepack][WARN]  $1"; }
ok() { echo "[prepack][OK]    $1"; }

# 1) Frontend build exists and uses relative asset paths
if [[ ! -f "$ROOT_DIR/frontend/dist/index.html" ]]; then
  fail "frontend/dist/index.html not found. Run: cd frontend && npm run build:electron"
fi

if rg -n "src=\"/assets|href=\"/assets|href=\"/vite.svg\"" "$ROOT_DIR/frontend/dist/index.html" >/dev/null; then
  fail "frontend/dist/index.html references absolute /assets or /vite.svg. Rebuild with: cd frontend && npm run build:electron"
else
  ok "Frontend assets use relative paths (./assets, ./vite.svg)"
fi

# 2) Backend binary exists
if [[ ! -x "$ROOT_DIR/backend/bin/signalhub-backend" ]]; then
  fail "backend/bin/signalhub-backend not found or not executable. Build with: bash backend/build-backend.sh"
else
  ok "Backend binary present"
fi

# 3) Whisper model present for offline transcription
if ! ls "$ROOT_DIR"/backend/whisper_cache/whisper/*.pt >/dev/null 2>&1; then
  fail "No Whisper model found under backend/whisper_cache/whisper/*.pt. Place base.pt or tiny.pt there."
else
  ok "Whisper model present in backend/whisper_cache"
fi

# 4) electron-builder config includes resources
if ! rg -n "frontend_dist" "$ROOT_DIR/desktop/electron-builder.yml" >/dev/null; then
  fail "electron-builder.yml missing frontend_dist in extraResources"
fi
if ! rg -n "whisper_cache" "$ROOT_DIR/desktop/electron-builder.yml" >/dev/null; then
  fail "electron-builder.yml missing whisper_cache in extraResources"
fi
ok "electron-builder extraResources configured"

echo "[prepack] All checks passed."

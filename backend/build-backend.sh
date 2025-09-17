#!/usr/bin/env bash
set -euo pipefail

# Build a standalone backend binary for the current OS/arch.
# Requires: pyinstaller (pip install pyinstaller)

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/.." && pwd)
OUT="$HERE/bin"

echo "Building backend binary into: $OUT"
mkdir -p "$OUT"

# Use start.py as entry or a small launcher that imports uvicorn app
cd "$ROOT/backend"

# PyInstaller one-file build
pyinstaller \
  --onefile \
  --name signalhub-backend \
  --add-data "app:app" \
  start.py

# Move artifact
if [[ -f dist/signalhub-backend ]]; then
  mv dist/signalhub-backend "$OUT/"
elif [[ -f dist/signalhub-backend.exe ]]; then
  mv dist/signalhub-backend.exe "$OUT/"
fi

echo "Done. Place the binary under backend/bin before packaging the desktop app."


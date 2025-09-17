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

# PyInstaller one-file build using desktop entrypoint (bundle deps)
pyinstaller -y --clean \
  --onefile \
  --name signalhub-backend \
  --add-data "app:app" \
  --collect-all fastapi \
  --collect-all starlette \
  --collect-all pydantic \
  --collect-all aiofiles \
  --collect-all anyio \
  --collect-all sniffio \
  --collect-all jinja2 \
  --collect-all whisper \
  --collect-all torch \
  --collect-all numpy \
  --collect-all tqdm \
  --collect-all pydub \
  --collect-all soundfile \
  --collect-all nltk \
  --collect-all vaderSentiment \
  --hidden-import fastapi.middleware.cors \
  --hidden-import starlette.middleware.cors \
  --hidden-import multipart \
  --hidden-import uvicorn \
  --hidden-import h11 \
  --hidden-import sqlalchemy \
  --hidden-import pydantic_settings \
  --hidden-import whisper \
  --hidden-import torch \
  --hidden-import numpy \
  --hidden-import tqdm \
  --hidden-import pydub \
  --hidden-import soundfile \
  --hidden-import nltk \
  --hidden-import vaderSentiment \
  desktop_entry.py

# Move artifact
if [[ -f dist/signalhub-backend ]]; then
  mv dist/signalhub-backend "$OUT/"
elif [[ -f dist/signalhub-backend.exe ]]; then
  mv dist/signalhub-backend.exe "$OUT/"
fi

echo "Done. Place the binary under backend/bin before packaging the desktop app."

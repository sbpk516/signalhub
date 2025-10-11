#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT_DIR/venv_mlx"
PYTHON_BIN="${PYTHON_BIN:-}"
FORCE=0

usage() {
  cat <<'HELP'
Usage: bash scripts/build-mlx-venv.sh [--force]

Creates the MLX-only virtual environment used by the packaged backend.
HELP
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$PYTHON_BIN" ]]; then
  if [[ -x "$ROOT_DIR/venv/bin/python" ]]; then
    PYTHON_BIN="$ROOT_DIR/venv/bin/python"
  else
    PYTHON_BIN="$(command -v python3 || true)"
  fi
fi

if [[ -z "$PYTHON_BIN" ]]; then
  echo "[mlx-venv] Could not locate python executable" >&2
  exit 1
fi

if [[ $FORCE -eq 1 && -d "$TARGET" ]]; then
  echo "[mlx-venv] Removing existing $TARGET"
  rm -rf "$TARGET"
fi

if [[ ! -d "$TARGET" ]]; then
  echo "[mlx-venv] Creating venv at $TARGET using $PYTHON_BIN"
  "$PYTHON_BIN" -m venv "$TARGET"
fi

echo "[mlx-venv] Upgrading pip"
"$TARGET/bin/pip" install --upgrade pip >/dev/null

echo "[mlx-venv] Installing MLX requirements"
"$TARGET/bin/pip" install --no-cache-dir -r "$ROOT_DIR/requirements-mlx.txt"

echo "[mlx-venv] Verifying imports"
if ! "$TARGET/bin/python" -c "import mlx, mlx_whisper" >/dev/null 2>&1; then
  echo "[mlx-venv] Failed to import mlx packages after installation" >&2
  exit 1
fi

echo "[mlx-venv] MLX virtual environment ready at $TARGET"

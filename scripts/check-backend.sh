#!/usr/bin/env bash
set -euo pipefail

echo "[backend-check] Running Python syntax checks (py_compile)..."

# Resolve repo root (script may be called from anywhere)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PYTHON_BIN=${PYTHON_BIN:-python3}

"$PYTHON_BIN" - <<'PY'
import os, sys, py_compile

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
targets = []
for rel in ("backend",):
    base = os.path.join(root, rel)
    for dirpath, dirnames, filenames in os.walk(base):
        # Skip cache/build dirs
        dirnames[:] = [d for d in dirnames if d not in ("__pycache__", "build", "dist")]
        for f in filenames:
            if f.endswith('.py'):
                targets.append(os.path.join(dirpath, f))

errors = []
for path in targets:
    try:
        py_compile.compile(path, doraise=True)
    except Exception as e:
        errors.append((path, str(e)))

if errors:
    print("[backend-check][ERROR] Syntax errors detected:")
    for p, msg in errors:
        print(f" - {p}: {msg}")
    sys.exit(1)
else:
    print(f"[backend-check][OK] {len(targets)} files compiled successfully")
PY


#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

run_step() {
  local label="$1"
  shift
  echo "==> $label"
  "$@"
}

format_check() {
  echo "==> Format check"
  if python -m black --version >/dev/null 2>&1; then
    python -m black --check "$BACKEND_DIR/app"
  else
    echo "[WARN] python black not installed; skipping backend format check" >&2
  fi

  if npm --prefix "$FRONTEND_DIR" exec --yes prettier --version >/dev/null 2>&1; then
    npm --prefix "$FRONTEND_DIR" exec --yes prettier "src/**/*.{ts,tsx,css}" --check
  else
    echo "[WARN] prettier not installed; skipping frontend format check" >&2
  fi
}

lint_check() {
  run_step "Backend lint" python -m flake8 "$BACKEND_DIR/app"
  run_step "Frontend lint" npm --prefix "$FRONTEND_DIR" run lint
}

type_check() {
  run_step "Backend type-check" python -m mypy "$BACKEND_DIR/app"
  run_step "Frontend type-check" npm --prefix "$FRONTEND_DIR" run type-check
}

unit_tests() {
  run_step "Backend unit tests" python -m pytest "$BACKEND_DIR/tests" -q
}

e2e_tests() {
  if [ -f "$ROOT_DIR/test_end_to_end_pipeline.py" ]; then
    run_step "Pipeline end-to-end" python -m pytest "$ROOT_DIR/test_end_to_end_pipeline.py" -q
  else
    echo "[WARN] No e2e test harness detected; skipping" >&2
  fi
}

main() {
  pushd "$ROOT_DIR" >/dev/null
  format_check
  lint_check
  type_check
  unit_tests
  e2e_tests
  popd >/dev/null
}

main "$@"

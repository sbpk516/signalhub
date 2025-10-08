#!/usr/bin/env bash
set -euo pipefail

if [[ "${OSTYPE}" != "darwin"* ]]; then
  echo "[build-mac-key-server] skipping – not running on macOS"
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SWIFT_FILE="$ROOT_DIR/vendor/mac-key-server/MacKeyServer.swift"
TARGET_DIR="$ROOT_DIR/node_modules/node-global-key-listener/bin"
TARGET_BIN="$TARGET_DIR/MacKeyServer"

if [[ ! -f "$SWIFT_FILE" ]]; then
  echo "[build-mac-key-server] Swift source not found: $SWIFT_FILE" >&2
  exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "[build-mac-key-server] Target directory missing: $TARGET_DIR" >&2
  exit 1
fi

if ! command -v swiftc >/dev/null 2>&1; then
  echo "[build-mac-key-server] swiftc not found. Install Xcode command-line tools." >&2
  exit 1
fi

echo "[build-mac-key-server] Compiling MacKeyServer.swift -> $TARGET_BIN"
swiftc "$SWIFT_FILE" -o "$TARGET_BIN"
chmod +x "$TARGET_BIN"

echo "[build-mac-key-server] MacKeyServer compiled successfully"

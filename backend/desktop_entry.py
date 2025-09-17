#!/usr/bin/env python3
"""
Desktop entrypoint for bundled backend.

Reads SIGNALHUB_MODE, SIGNALHUB_PORT, SIGNALHUB_DATA_DIR from environment and
starts the FastAPI app using uvicorn bound to 127.0.0.1.

This avoids relying on repository files like config.js when running from a packaged app.
"""
import os
import sys
from typing import Optional

import uvicorn

try:
    # Ensure app import works when bundled (PyInstaller --add-data app:app)
    from app.main import app  # type: ignore
except Exception as e:
    print(f"❌ Failed to import FastAPI app: {e}")
    sys.exit(1)


def getenv_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default


def main() -> int:
    # Desktop mode env
    os.environ.setdefault("SIGNALHUB_MODE", "desktop")

    port = getenv_int("SIGNALHUB_PORT", 8001)
    host = "127.0.0.1"

    data_dir = os.getenv("SIGNALHUB_DATA_DIR")
    if data_dir:
        os.makedirs(data_dir, exist_ok=True)
        print(f"📁 Desktop data dir: {data_dir}")

    print(f"🚀 Starting bundled backend on http://{host}:{port}")
    try:
        uvicorn.run(app, host=host, port=port, log_level="info")
        return 0
    except Exception as e:
        print(f"❌ Error starting bundled backend: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())


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

APP_IMPORT_ERROR = None
app = None  # type: ignore


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
        logs_dir = os.path.join(data_dir, "logs")
        os.makedirs(logs_dir, exist_ok=True)
        print(f"📁 Desktop data dir: {data_dir}")
        # Sentinel: prove writeability and capture earliest failures
        try:
            with open(os.path.join(logs_dir, "backend_boot.txt"), "a") as f:
                f.write("boot\n")
        except Exception as se:
            print(f"❌ Log dir not writable: {se}")

    # Import app only after logs dir exists so we can record any error
    global app
    if app is None:
        try:
            from app.main import app as _app  # type: ignore
            app = _app
        except Exception as e:
            # Also write error to logs if possible
            err = f"Failed to import FastAPI app: {e}"
            print(f"❌ {err}")
            if data_dir:
                try:
                    with open(os.path.join(data_dir, "logs", "backend_import_error.txt"), "a") as f:
                        f.write(str(err) + "\n")
                except Exception:
                    pass
            return 1

    print(f"🚀 Starting bundled backend on http://{host}:{port}")
    try:
        uvicorn.run(app, host=host, port=port, log_level="info")
        return 0
    except Exception as e:
        print(f"❌ Error starting bundled backend: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

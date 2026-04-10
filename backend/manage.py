#!/usr/bin/env python3
"""
This is a wrapper to simulate Django's 'manage.py' behavior for this FastAPI application.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
_VENV_PYTHON = _ROOT / ".venv" / "bin" / "python"


def _in_project_venv() -> bool:
    """`.venv` ichidagi interpretator (sys.prefix) — tizim python bilan bir xil fayl bo'lishi mumkin."""
    try:
        return Path(sys.prefix).resolve() == (_ROOT / ".venv").resolve()
    except OSError:
        return False


def _reexec_with_project_venv_if_needed() -> None:
    """Tizim `python` bilan chaqirilsa ham `.venv` dagi paketlar (jose, uvicorn, ...) ishlasin."""
    if not _VENV_PYTHON.is_file() or _in_project_venv():
        return
    os.execv(str(_VENV_PYTHON), [str(_VENV_PYTHON), *sys.argv])


_reexec_with_project_venv_if_needed()

import subprocess


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "runserver":
        print("⚡ Django uslubida FastAPI serverini ishga tushirmoqdamiz (manage.py runserver)...")
        # Start uvicorn server with hot reload
        try:
            subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "app.main:app",
                    "--host",
                    "0.0.0.0",
                    "--port",
                    "8000",
                    "--reload",
                    "--timeout-keep-alive",
                    "600",
                ],
                check=True,
            )
        except KeyboardInterrupt:
            print("\nServer to'xtatildi.")
    else:
        print("Noma'lum buyruq! Iltimos faqat quyidagidan foydalaning:")
        print("  python manage.py runserver")

if __name__ == "__main__":
    main()

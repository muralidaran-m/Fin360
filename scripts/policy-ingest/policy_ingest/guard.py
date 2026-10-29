"""Keeps the coding agent (Claude Code) from processing real policy documents.

Claude Code sets CLAUDECODE=1 in the shells it runs. Anything under the project's
private/ folder is real data, so commands touching it must be run by the user in their
own terminal. Synthetic test data lives elsewhere and is unaffected.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
PRIVATE_DIR = PROJECT_ROOT / "private"


def is_private(path: Path) -> bool:
    try:
        path.resolve().relative_to(PRIVATE_DIR.resolve())
        return True
    except ValueError:
        return False


def refuse_agent_on_private(*paths: Path) -> None:
    if os.environ.get("CLAUDECODE") != "1":
        return
    if any(is_private(p) for p in paths):
        sys.exit(
            "Refusing to run: this touches private/ (real policy documents) from inside "
            "Claude Code. Run the command in your own terminal instead."
        )

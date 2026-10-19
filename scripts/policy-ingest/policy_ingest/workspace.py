"""File layout for one ingested document.

    private/policies/inbox/<file>.pdf          your PDFs
    private/policies/work/<nickname>/          pages.json (raw text), redacted.md, vault.json,
                                               review.html, gate.json, extraction.json
    private/policies/<nickname>.plan.json      reviewed by you, then applied to Sheets
    private/pii-denylist.txt                   your own personal details (see denylist.py)
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict
from pathlib import Path

from .extract import Page
from .guard import PRIVATE_DIR

DEFAULT_ROOT = PRIVATE_DIR / "policies"
DEFAULT_DENYLIST = PRIVATE_DIR / "pii-denylist.txt"


class Workspace:
    def __init__(self, root: Path, nickname: str):
        self.root = root
        self.nickname = nickname
        self.dir = root / "work" / nickname

    pages_json = property(lambda self: self.dir / "pages.json")
    redacted_md = property(lambda self: self.dir / "redacted.md")
    vault_json = property(lambda self: self.dir / "vault.json")
    review_html = property(lambda self: self.dir / "review.html")
    gate_json = property(lambda self: self.dir / "gate.json")
    extraction_json = property(lambda self: self.dir / "extraction.json")
    plan_json = property(lambda self: self.root / f"{self.nickname}.plan.json")

    def save_pages(self, pages: list[Page]) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)
        self.pages_json.write_text(json.dumps([asdict(p) for p in pages], ensure_ascii=False, indent=1))

    def load_pages(self) -> list[Page]:
        if not self.pages_json.exists():
            raise SystemExit(f"No extracted pages for '{self.nickname}'. Run `policy-ingest redact` first.")
        return [Page(**p) for p in json.loads(self.pages_json.read_text())]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

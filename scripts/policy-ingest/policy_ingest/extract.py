"""PDF to per-page text, with an OCR fallback for scanned pages."""
from __future__ import annotations

import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import pdfplumber

# A page with less extractable text than this is treated as a scanned image.
MIN_TEXT_CHARS = 25


@dataclass
class Page:
    number: int
    text: str
    kind: str  # "text" | "ocr" | "scanned-no-ocr"


def _read(pdf_path: Path) -> list[str]:
    with pdfplumber.open(pdf_path) as pdf:
        return [(page.extract_text() or "") for page in pdf.pages]


def extract_pages(pdf_path: Path) -> list[Page]:
    texts = _read(pdf_path)
    scanned = [i for i, t in enumerate(texts) if len(t.strip()) < MIN_TEXT_CHARS]
    if not scanned:
        return [Page(i + 1, t, "text") for i, t in enumerate(texts)]

    if shutil.which("ocrmypdf") is None:
        return [
            Page(i + 1, t, "scanned-no-ocr" if i in scanned else "text")
            for i, t in enumerate(texts)
        ]

    # OCR runs locally; the temporary PDF never leaves this machine and is deleted after.
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "ocr.pdf"
        subprocess.run(
            ["ocrmypdf", "--skip-text", "--quiet", "-l", "eng", str(pdf_path), str(out)],
            check=True,
        )
        ocr_texts = _read(out)
    return [
        Page(i + 1, ocr_texts[i] if i in scanned else t, "ocr" if i in scanned else "text")
        for i, t in enumerate(texts)
    ]

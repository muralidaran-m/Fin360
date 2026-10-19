"""Content-free audit of a redaction run: counts, page types and a shape report.

The output is designed to be pasted to the coding agent. It contains no personal values:
placeholders and known label words are shown as-is, every other word is reduced to
character classes (Xxxxx, 9999). Read it yourself before sharing anyway.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict

from .denylist import DenyItem, find
from .extract import Page
from .lexicon import LABEL_LEXICON
from .redact import RedactionResult

MAX_SHAPE_LINES = 120
_PLACEHOLDER = re.compile(r"\[[A-Z_0-9]+(?: ending \d{4}|, age \d+ at commencement)?\]")


def shape_word(word: str) -> str:
    if word.lower().strip(".,:;()'%") in LABEL_LEXICON:
        return word
    out = []
    for ch in word:
        out.append("9" if ch.isdigit() else "X" if ch.isupper() else "x" if ch.isalpha() else ch)
    return "".join(out)


def shape_line(line: str) -> str:
    pieces, pos = [], 0
    for m in _PLACEHOLDER.finditer(line):
        pieces.append(" ".join(shape_word(w) for w in line[pos : m.start()].split(" ")))
        pieces.append(m.group(0))
        pos = m.end()
    pieces.append(" ".join(shape_word(w) for w in line[pos:].split(" ")))
    return "".join(pieces)


def build(result: RedactionResult, pages: list[Page], deny_items: list[DenyItem], findings: list[dict] | None) -> str:
    out = ["POLICY-INGEST AUDIT (no personal values; read before sharing)", ""]
    out.append(f"pages: {len(pages)}")
    for p in pages:
        out.append(f"  page {p.number}: {p.kind}, {len(p.text)} chars")

    out += ["", "detections by page (kind/source: count):"]
    per_page: dict[int, Counter] = defaultdict(Counter)
    for s in result.spans:
        per_page[result.page_of(s.start)][f"{s.kind}/{s.source}"] += 1
    for page in sorted(per_page):
        out.append(f"  page {page}: " + ", ".join(f"{k}: {v}" for k, v in sorted(per_page[page].items())))

    out += [""]
    if deny_items:
        by_kind = Counter(i.kind for i in deny_items)
        missed = [i for i in deny_items if i.index in set(result.denylist_detector_misses)]
        survivors = {item.index for item, _, _ in find(deny_items, result.redacted)}
        out.append(f"deny-list: {len(deny_items)} items ({', '.join(f'{k}: {v}' for k, v in sorted(by_kind.items()))})")
        out.append(
            f"  missed by detectors: {len(missed)}"
            + (f" (item #{', #'.join(str(i.index) for i in missed)}; types: {', '.join(sorted({i.kind for i in missed}))})" if missed else "")
        )
        out.append(f"  surviving after deny-list fallback: {len(survivors)}")
    else:
        out.append("deny-list: none loaded (detector quality on this document is unmeasured)")

    if findings is not None:
        out.append(f"local model leftover findings: {len(findings)} ({', '.join(f'{k}: {v}' for k, v in sorted(Counter(f['type'] for f in findings).items())) or 'none'})")

    out += ["", "shape report (labels kept, values reduced to X/x/9):"]
    shown = 0
    for line in result.redacted.split("\n"):
        if shown >= MAX_SHAPE_LINES:
            out.append("  ...")
            break
        if ":" in line or _PLACEHOLDER.search(line) or re.search(r"\d", line) or line.startswith("=== Page"):
            out.append("  " + (line if line.startswith("=== Page") else shape_line(line.strip())[:140]))
            shown += 1
    return "\n".join(out)

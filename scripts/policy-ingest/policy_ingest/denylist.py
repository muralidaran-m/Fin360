"""Your own known personal details, used as a final safety net and as the measure of
how well the detectors work on real documents.

File format (private/pii-denylist.txt), one item per line, optional type prefix:
    name: Ravi Kumar Iyer
    pan: ABCDE1234F
    phone: 98765 43210
    address: 12 Gandhi Road
    # comments are ignored
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class DenyItem:
    index: int  # 1-based line item number, used in reports instead of the value
    kind: str
    value: str
    patterns: list[re.Pattern[str]]


def _pattern_for(value: str) -> re.Pattern[str]:
    compact = re.sub(r"[\s\-]", "", value)
    if sum(ch.isdigit() for ch in compact) >= max(4, len(compact) * 0.6):
        # Mostly digits: allow any spacing or dashes between characters.
        body = r"[\s\-]?".join(re.escape(ch) for ch in compact)
        return re.compile(r"(?<![\dA-Za-z])" + body + r"(?![\dA-Za-z])", re.I)
    tokens = [re.escape(t) for t in re.split(r"[\s,.\-]+", value.strip()) if t]
    return re.compile(r"\b" + r"[\s,.\-]+".join(tokens) + r"\b", re.I)


def load(path: Path) -> list[DenyItem]:
    items: list[DenyItem] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        kind, _, value = line.partition(":") if re.match(r"^[a-z_]+\s*:", line) else ("other", "", line)
        kind, value = kind.strip().lower(), value.strip()
        if len(value) < 3:
            continue
        patterns = [_pattern_for(value)]
        if kind == "name":
            # A surname or first name on its own is still a leak, even when it is also a
            # brand word (a person named Anand holding LIC Jeevan Anand): privacy wins.
            for token in re.split(r"[\s.]+", value):
                if len(token) >= 3:
                    patterns.append(re.compile(r"\b" + re.escape(token) + r"\b", re.I))
        items.append(DenyItem(len(items) + 1, kind, value, patterns))
    return items


def find(items: list[DenyItem], text: str) -> list[tuple[DenyItem, int, int]]:
    hits = []
    for item in items:
        for rx in item.patterns:
            hits.extend((item, m.start(), m.end()) for m in rx.finditer(text))
    return hits

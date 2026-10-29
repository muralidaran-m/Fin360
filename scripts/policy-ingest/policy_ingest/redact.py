"""Combine detector spans, propagate known names, assign stable placeholders, redact."""
from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field

from . import denylist as dl
from .extract import Page
from .lexicon import COMMON_WORDS, KEEP_TERMS
from .recognizers import (
    Span,
    detect_addresses,
    detect_dob,
    detect_labelled_ids,
    detect_labelled_people,
    detect_patterns,
    detect_table_names,
    ocr_variants,
)

PAGE_MARKER = "=== Page {n} ==="
_PAGE_MARKER_RE = re.compile(r"^=== Page (\d+) ===$", re.M)
_HONORIFIC_RE = re.compile(r"^(?:mr|mrs|ms|miss|master|mast|dr|shri|sri|smt|kumari|km|baby)\.?\s+", re.I)

# Specific roles beat the generic PERSON when the same name shows up under several labels.
_ROLE_RANK = {"POLICYHOLDER": 0, "LIFE_ASSURED": 1, "CHILD": 2, "NOMINEE": 3, "APPOINTEE": 4,
              "GUARDIAN": 5, "RELATIVE": 6, "AGENT": 7, "PERSON": 9}
_SOURCE_RANK = {"label": 0, "regex": 1, "address": 2, "denylist": 3, "ner": 4, "propagated": 5}


@dataclass
class RedactionResult:
    original: str
    redacted: str
    spans: list[Span]  # merged, non-overlapping, each with meta["placeholder"]
    vault: dict[str, list[str]]  # placeholder -> original values (stays in private/)
    detector_spans: list[Span] = field(default_factory=list)  # before the deny-list pass
    denylist_detector_misses: list[int] = field(default_factory=list)  # deny item indexes

    def page_of(self, offset: int) -> int:
        page = 1
        for m in _PAGE_MARKER_RE.finditer(self.original):
            if m.start() > offset:
                break
            page = int(m.group(1))
        return page


def join_pages(pages: list[Page]) -> str:
    return "\n\n".join(f"{PAGE_MARKER.format(n=p.number)}\n{p.text}" for p in pages)


def _person_key(value: str) -> str:
    v = _HONORIFIC_RE.sub("", value.strip())
    return re.sub(r"\s+", " ", v.replace(".", " ")).strip().lower()


def _value_key(kind: str, value: str) -> str:
    if kind == "PERSON":
        return _person_key(value)
    compact = re.sub(r"[\s\-/]", "", value).lower()
    return compact if kind != "ADDRESS" else re.sub(r"\W+", " ", value).strip().lower()


def _propagate_names(text: str, spans: list[Span]) -> list[Span]:
    """Every other mention of a detected name (full or a distinctive part) is redacted
    too, with the same placeholder."""
    covered = [(s.start, s.end) for s in spans]
    out: list[Span] = []
    for s in [s for s in spans if s.kind == "PERSON"]:
        key = _person_key(text[s.start : s.end])
        variants = {key} | {
            t for t in key.split() if len(t) >= 3 and t not in COMMON_WORDS and t not in KEEP_TERMS
        }
        for v in variants:
            for m in re.finditer(r"\b" + r"[\s.]+".join(map(re.escape, v.split())) + r"\b", text, re.I):
                if not any(a <= m.start() and m.end() <= b for a, b in covered):
                    out.append(Span(m.start(), m.end(), "PERSON", "propagated", role=s.role, meta={"person_key": key}))
                    covered.append((m.start(), m.end()))
    return out


def _merge(spans: list[Span]) -> list[Span]:
    spans = sorted(spans, key=lambda s: (s.start, -s.length))
    groups: list[list[Span]] = []
    for s in spans:
        if groups and s.start < max(g.end for g in groups[-1]):
            groups[-1].append(s)
        else:
            groups.append([s])
    merged = []
    for g in groups:
        lead = min(g, key=lambda s: (-s.length, _SOURCE_RANK[s.source]))
        start, end = min(s.start for s in g), max(s.end for s in g)
        meta = dict(lead.meta)
        for s in g:
            for k, v in s.meta.items():
                meta.setdefault(k, v)
        roles = [s.role for s in g if s.role]
        role = min(roles, key=lambda r: _ROLE_RANK.get(r, 9)) if roles else None
        merged.append(Span(start, end, lead.kind, lead.source, role=role, meta=meta))
    return merged


def _placeholder_text(kind: str, label: str, value: str, meta: dict) -> str:
    if kind == "DOB":
        age = meta.get("age_at_commencement")
        return f"[DOB, age {age} at commencement]" if age is not None else "[DOB]"
    if kind == "POLICY_NO":
        digits = re.sub(r"\W", "", value)
        return f"[{label} ending {digits[-4:]}]"
    return f"[{label}]"


def redact(pages: list[Page], deny_items: list[dl.DenyItem] | None = None, use_ner: bool = True) -> RedactionResult:
    text = join_pages(pages)
    spans = []
    for variant in [text, *ocr_variants(text)]:
        spans += (
            detect_patterns(variant)
            + detect_labelled_ids(variant)
            + detect_dob(variant)
            + detect_labelled_people(variant)
            + detect_table_names(variant)
            + detect_addresses(variant)
        )
    if use_ner:
        from .ner import detect_people

        spans += detect_people(text)
    spans = [s for s in spans if not _PAGE_MARKER_RE.fullmatch(text[s.start : s.end])]
    spans += _propagate_names(text, spans)
    detector_spans = _merge(spans)

    misses: list[int] = []
    if deny_items:
        for item, a, b in dl.find(deny_items, text):
            if not any(s.start <= a and b <= s.end for s in detector_spans):
                misses.append(item.index)
                kind = {"name": "PERSON", "pan": "PAN", "phone": "PHONE", "email": "EMAIL",
                        "address": "ADDRESS", "dob": "DOB", "aadhaar": "AADHAAR"}.get(item.kind, "OTHER")
                spans.append(Span(a, b, kind, "denylist", role="PERSON" if kind == "PERSON" else None))
    merged = _merge(spans)

    # Stable placeholders: the same value always maps to the same placeholder. A partial
    # mention ("Mr. Iyer") maps to the full name it belongs to, preferring labelled roles.
    full_names = sorted(
        {_person_key(text[s.start : s.end]): s.role for s in merged if s.kind == "PERSON" and s.role != "PERSON"}.items(),
        key=lambda kv: _ROLE_RANK.get(kv[1] or "PERSON", 9),
    )
    best_role: dict[str, str] = {}
    keys = []
    for s in merged:
        value = text[s.start : s.end]
        key = s.meta.get("person_key") if s.kind == "PERSON" and s.meta.get("person_key") else _value_key(s.kind, value)
        if s.kind == "PERSON":
            tokens = set(key.split())
            for full, _role in full_names:
                if tokens and tokens < set(full.split()):
                    key = full
                    break
        keys.append((s.kind, key))
        if s.kind == "PERSON":
            r = s.role or "PERSON"
            if _ROLE_RANK.get(r, 9) < _ROLE_RANK.get(best_role.get(key, "PERSON"), 9) or key not in best_role:
                best_role[key] = r
    labels: dict[tuple[str, str], str] = {}
    counters: dict[str, int] = defaultdict(int)
    vault: dict[str, list[str]] = defaultdict(list)
    out, pos = [], 0
    for s, (kind, key) in zip(merged, keys):
        if (kind, key) not in labels:
            base = best_role.get(key, "PERSON") if kind == "PERSON" else kind
            counters[base] += 1
            labels[(kind, key)] = base if counters[base] == 1 else f"{base}_{counters[base]}"
        value = text[s.start : s.end]
        placeholder = _placeholder_text(kind, labels[(kind, key)], value, s.meta)
        s.meta["placeholder"] = placeholder
        if value not in vault[placeholder]:
            vault[placeholder].append(value)
        out.append(text[pos : s.start])
        out.append(placeholder)
        pos = s.end
    out.append(text[pos:])
    return RedactionResult(text, "".join(out), merged, dict(vault), detector_spans, sorted(set(misses)))

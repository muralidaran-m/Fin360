"""Score redaction against the synthetic answer key.

Run directly for a per-type report:  uv run python -m tests.synth.evaluate
"""
from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from policy_ingest import denylist as dl
from policy_ingest.extract import extract_pages
from policy_ingest.redact import redact

from .documents import build_all
from .render import render

OUT = Path(__file__).parent / "out"
IDENTIFIER_KINDS = {"pan", "aadhaar", "phone", "email", "ifsc", "policy_no", "account_no",
                    "folio", "customer_id", "agent_code", "dob"}


@dataclass
class Score:
    planted: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    leaked: dict[str, list[str]] = field(default_factory=lambda: defaultdict(list))  # kind -> "doc: value"
    keep_total: int = 0
    keep_lost: list[str] = field(default_factory=list)

    def recall(self, kind: str) -> float:
        n = self.planted[kind]
        return 1.0 if n == 0 else (n - len(self.leaked[kind])) / n

    @property
    def keep_rate(self) -> float:
        return 1.0 if not self.keep_total else (self.keep_total - len(self.keep_lost)) / self.keep_total


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s)


def evaluate(use_ner: bool = True) -> Score:
    score = Score()
    for doc in build_all():
        pages = extract_pages(render(doc, OUT))
        result = redact(pages, use_ner=use_ner)
        redacted = _norm(result.redacted)
        for kind, value in doc.pii:
            score.planted[kind] += 1
            item = dl.DenyItem(0, kind, value, [dl._pattern_for(value)])
            if kind == "name":
                item.patterns += [
                    re.compile(r"\b" + re.escape(t) + r"\b", re.I) for t in value.split() if len(t) >= 3
                ]
            if dl.find([item], redacted):
                score.leaked[kind].append(f"{doc.name}: {value}")
        for value in doc.keep:
            score.keep_total += 1
            if _norm(value) not in redacted:
                score.keep_lost.append(f"{doc.name}: {value}")
    return score


def report(score: Score) -> str:
    lines = [f"{'type':<12} {'planted':>7} {'leaked':>6} {'recall':>7}"]
    for kind in sorted(score.planted):
        lines.append(f"{kind:<12} {score.planted[kind]:>7} {len(score.leaked[kind]):>6} {score.recall(kind):>7.1%}")
    lines.append(f"\nkept plan facts: {score.keep_total - len(score.keep_lost)}/{score.keep_total} ({score.keep_rate:.1%})")
    for kind, misses in score.leaked.items():
        for miss in misses:
            lines.append(f"LEAK  {kind}: {miss}")
    for lost in score.keep_lost:
        lines.append(f"LOST  {lost}")
    return "\n".join(lines)


if __name__ == "__main__":
    print(report(evaluate()))

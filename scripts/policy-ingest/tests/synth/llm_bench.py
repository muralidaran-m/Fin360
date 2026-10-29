"""Compare local models on the leftover-PII scan, using fake data only.

    uv run python -m tests.synth.llm_bench MODEL.gguf [MODEL.gguf ...]

Positives are lines with personal details the deterministic detectors are likely to miss
(prose, witnesses, table rows, obfuscated contacts). Negatives are the fully redacted
synthetic documents: anything flagged there is a false alarm.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

from policy_ingest import llm
from policy_ingest.extract import extract_pages
from policy_ingest.redact import redact

from .documents import build_all
from .evaluate import OUT
from .render import render

# (line, [planted values that should be flagged])
POSITIVES: list[tuple[str, list[str]]] = [
    ("Received from Deepak Venugopal towards renewal premium.", ["Deepak Venugopal"]),
    ("Witness: Farhan Siddiqui, 22 Marine Drive, Kochi", ["Farhan Siddiqui", "22 Marine Drive"]),
    ("NOMINEE 2 : ANJALI MENON    Share 50%", ["ANJALI MENON"]),
    ("Medical report signed by Dr Kavya Raman, MBBS", ["Kavya Raman"]),
    ("Bank: State Bank of India, account held by S. Balasubramaniam", ["Balasubramaniam"]),
    ("Old address: 7/3 Kamaraj Salai, Mylapore", ["Kamaraj Salai"]),
    ("Send copies to pradeep.k.nair at gmail dot com", ["pradeep.k.nair"]),
    ("Emergency contact: Lata (sister) 98400 12345", ["Lata", "98400 12345"]),
    ("Signed at Coimbatore on 12/05/2019 by Arvind Swaminathan", ["Arvind Swaminathan"]),
    ("Ishaan Kulkarni Son 12 100%", ["Ishaan Kulkarni"]),
    ("Payout to the account of Nikhil Desai, ending 4521", ["Nikhil Desai"]),
    ("D/o Ramesh Chandran", ["Ramesh Chandran"]),
    ("Aadhaar enrolment no. 1234/56789/01234", ["1234/56789/01234"]),
    ("Thank you, Mrs Revathi, for renewing with us.", ["Revathi"]),
    ("Residing at Plot 18, Sai Nagar, Hosur Road", ["Sai Nagar"]),
]


def _hit(value: str, findings: list[dict]) -> bool:
    v = value.lower()
    return any(v in f["text"].lower() or (len(f["text"]) >= 4 and f["text"].lower() in v) for f in findings)


def bench(model: Path, port: int = 8091) -> dict:
    url = f"http://127.0.0.1:{port}"
    proc = llm.serve(model, port)
    try:
        started = time.time()
        pos_findings = []
        for line, _ in POSITIVES:
            pos_findings.append(llm.scan(line, url=url).findings)
        pos_time = time.time() - started

        clean = "\n\n".join(redact(extract_pages(render(d, OUT))).redacted for d in build_all())
        started = time.time()
        neg = llm.scan(clean, url=url)
        neg_time = time.time() - started
    finally:
        proc.terminate()
        proc.wait()

    planted = [(line, v) for line, values in POSITIVES for v in values]
    missed = [v for (line, v) in planted if not _hit(v, pos_findings[[l for l, _ in POSITIVES].index(line)])]
    return {
        "model": model.name,
        "recall": (len(planted) - len(missed)) / len(planted),
        "missed": missed,
        "false_alarms": [f["text"] for f in neg.findings],
        "unscanned": neg.unscanned,
        "pos_seconds": pos_time,
        "neg_seconds": neg_time,
    }


if __name__ == "__main__":
    for path in sys.argv[1:]:
        r = bench(Path(path).expanduser())
        print(f"\n== {r['model']}")
        print(f"recall on planted leftovers: {r['recall']:.0%}  ({len(r['missed'])} missed: {', '.join(r['missed']) or '-'})")
        print(f"false alarms on clean redacted docs: {len(r['false_alarms'])}  {r['false_alarms']}")
        print(f"time: {r['pos_seconds']:.0f}s for {len(POSITIVES)} lines, {r['neg_seconds']:.0f}s for clean docs; unscanned chunks {r['unscanned']}")

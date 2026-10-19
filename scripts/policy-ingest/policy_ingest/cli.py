"""policy-ingest: redact policy PDFs locally, verify, then extract facts with Claude.

Run these yourself in a terminal (not through Claude Code) when they touch private/:

    uv run policy-ingest serve                         # local model, leave running
    uv run policy-ingest run private/policies/inbox/pension.pdf --nickname pension
    # or step by step: redact -> audit -> gate -> extract
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from . import audit as audit_mod
from . import denylist as dl
from . import gate as gate_mod
from . import llm
from .guard import refuse_agent_on_private
from .workspace import DEFAULT_DENYLIST, DEFAULT_ROOT, Workspace


def _deny_items(path: Path, required: bool) -> list[dl.DenyItem]:
    if path.exists():
        return dl.load(path)
    if required:
        sys.exit(
            f"No deny-list at {path}. Create it with your own name, PAN, phone, email, address lines and "
            "family names (see policy_ingest/denylist.py), or pass --no-denylist."
        )
    print(f"warning: no deny-list at {path}; leaks of your own details cannot be measured.")
    return []


def cmd_serve(a) -> None:
    proc = llm.serve(Path(a.model), a.port)
    print(f"llama-server running on http://127.0.0.1:{a.port} (Ctrl-C to stop)")
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()


def cmd_redact(a) -> Workspace:
    from .extract import extract_pages
    from .redact import redact
    from .review import write_review

    pdf = Path(a.pdf)
    nickname = a.nickname or re.sub(r"[^a-z0-9]+", "-", pdf.stem.lower()).strip("-")
    ws = Workspace(Path(a.root), nickname)
    refuse_agent_on_private(pdf, ws.dir, Path(a.denylist))
    items = _deny_items(Path(a.denylist), required=False) if not a.no_denylist else []

    pages = extract_pages(pdf)
    ws.save_pages(pages)
    result = redact(pages, items)
    ws.redacted_md.write_text(result.redacted, encoding="utf-8")
    ws.vault_json.write_text(json.dumps(result.vault, ensure_ascii=False, indent=2))
    write_review(result, ws.review_html)
    if ws.gate_json.exists():
        ws.gate_json.unlink()  # any earlier approval was for different text

    scanned = [p.number for p in pages if p.kind == "scanned-no-ocr"]
    print(f"{nickname}: {len(pages)} page(s), {len(result.spans)} redactions, {len(result.vault)} placeholders")
    if scanned:
        print(f"warning: page(s) {scanned} are scanned images and ocrmypdf is not installed "
              "(`brew install ocrmypdf`); their content is missing.")
    if result.denylist_detector_misses:
        print(f"deny-list caught {len(result.denylist_detector_misses)} item(s) the detectors missed "
              "(redacted anyway; see `audit` for types).")
    print(f"review: {ws.review_html}")
    return ws


def cmd_audit(a) -> None:
    from .redact import redact

    ws = Workspace(Path(a.root), a.nickname)
    refuse_agent_on_private(ws.dir, Path(a.denylist))
    items = _deny_items(Path(a.denylist), required=False)
    pages = ws.load_pages()
    findings = llm.scan(ws.redacted_md.read_text(encoding="utf-8")) if a.llm else None
    print(audit_mod.build(redact(pages, items), pages, items, findings))


def cmd_gate(a) -> bool:
    ws = Workspace(Path(a.root), a.nickname)
    refuse_agent_on_private(ws.dir, Path(a.denylist))
    items = [] if a.no_denylist else _deny_items(Path(a.denylist), required=True)
    return gate_mod.run(ws, items, skip_llm=a.skip_llm)


def cmd_extract(a) -> None:
    from .claude_extract import extract, write_plan

    ws = Workspace(Path(a.root), a.nickname)
    refuse_agent_on_private(ws.dir, Path(a.denylist))
    items = [] if a.no_denylist else _deny_items(Path(a.denylist), required=True)
    extraction = extract(ws, items, a.model)
    plan = write_plan(ws, extraction)
    p = plan.policy
    print(f"{p.insurer} {p.planName} ({p.type}): starts {p.startDate}, "
          f"{p.premiumFrequency} premium {p.premiumAmount}, {len(plan.payouts)} payout(s)")
    for c in extraction.caveats:
        print(f"  caveat: {c}")
    print(f"\nCheck these against your PDF, then apply with:\n  npm run policy:apply -- --plan={ws.plan_json}")


def cmd_run(a) -> None:
    ws = cmd_redact(a)
    a.nickname = ws.nickname
    cmd_audit(argparse.Namespace(**{**vars(a), "llm": False}))
    if cmd_gate(a):
        cmd_extract(a)


def main(argv: list[str] | None = None) -> None:
    from .claude_extract import MODEL

    parser = argparse.ArgumentParser(prog="policy-ingest", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    def common(p, nickname=True):
        p.add_argument("--root", default=str(DEFAULT_ROOT), help="working folder (default: private/policies)")
        p.add_argument("--denylist", default=str(DEFAULT_DENYLIST))
        p.add_argument("--no-denylist", action="store_true")
        if nickname:
            p.add_argument("nickname")

    p = sub.add_parser("serve", help="start the local model (llama-server on localhost)")
    p.add_argument("--model", default=str(llm.DEFAULT_MODEL))
    p.add_argument("--port", type=int, default=8080)
    p.set_defaults(fn=cmd_serve)

    p = sub.add_parser("redact", help="extract text from a PDF and redact it locally")
    p.add_argument("pdf")
    p.add_argument("--nickname")
    common(p, nickname=False)
    p.set_defaults(fn=cmd_redact)

    p = sub.add_parser("audit", help="print a content-free report you can share with the coding agent")
    p.add_argument("--llm", action="store_true", help="include the local model's leftover count")
    common(p)
    p.set_defaults(fn=cmd_audit)

    p = sub.add_parser("gate", help="deny-list check, local model scan, your approval")
    p.add_argument("--skip-llm", action="store_true")
    common(p)
    p.set_defaults(fn=cmd_gate)

    p = sub.add_parser("extract", help="send the approved redacted text to Claude, write the plan JSON")
    p.add_argument("--model", default=MODEL)
    common(p)
    p.set_defaults(fn=cmd_extract)

    p = sub.add_parser("run", help="redact, audit, gate and extract in one go")
    p.add_argument("pdf")
    p.add_argument("--nickname")
    p.add_argument("--skip-llm", action="store_true")
    p.add_argument("--model", default=MODEL)
    common(p, nickname=False)
    p.set_defaults(fn=cmd_run)

    args = parser.parse_args(argv)
    args.fn(args)


if __name__ == "__main__":
    main()

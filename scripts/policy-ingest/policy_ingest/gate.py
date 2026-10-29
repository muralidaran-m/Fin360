"""The verification gate. Nothing reaches Claude unless this has approved the exact bytes
of redacted.md (checked again by hash right before the API call)."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from . import llm
from .denylist import DenyItem, find
from .workspace import Workspace, sha256


def denylist_survivors(deny_items: list[DenyItem], text: str) -> list[DenyItem]:
    return list({item.index: item for item, _, _ in find(deny_items, text)}.values())


def run(ws: Workspace, deny_items: list[DenyItem], skip_llm: bool = False, assume_yes: bool = False) -> bool:
    redacted = ws.redacted_md.read_text(encoding="utf-8")

    survivors = denylist_survivors(deny_items, redacted)
    if survivors:
        print(f"BLOCKED: {len(survivors)} deny-list item(s) still appear in the redacted text "
              f"(item #{', #'.join(str(i.index) for i in survivors)}). Re-run the redact step.")
        return False
    print(f"deny-list: {len(deny_items)} items, 0 survive.")

    findings: list[dict] = []
    if not skip_llm:
        if not llm.healthy():
            print("BLOCKED: local model is not running. Start it with `npm run policy:ingest -- serve` in another "
                  "terminal, or pass --skip-llm to rely on the deny-list and your own review only.")
            return False
        print("Scanning with the local model ...")
        scan = llm.scan(redacted, progress=True)
        findings = scan.findings
        if scan.unscanned:
            print(f"WARNING: {scan.unscanned} of {scan.chunks} chunk(s) could not be scanned. Review those "
                  "parts of review.html yourself, or raise POLICY_LLM_TIMEOUT and re-run the gate.")
        if findings:
            print(f"The local model flagged {len(findings)} possible leftover(s):")
            for f in findings:
                print(f"  - {f['type']}: {f['text']}")
            print("If any are real, add them to the deny-list and re-run the redact step.")
        else:
            print("Local model: nothing flagged.")

    print(f"\nReview the side-by-side diff in your browser:\n  {ws.review_html}")
    if not assume_yes:
        answer = input("Type 'approve' to allow redacted.md to be sent to Claude: ").strip().lower()
        if answer != "approve":
            print("Not approved. Nothing was sent.")
            return False

    ws.gate_json.write_text(json.dumps({
        "approved": True,
        "redacted_sha256": sha256(ws.redacted_md),
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "denylist_items": len(deny_items),
        "llm_findings": len(findings),
        "llm_unscanned_chunks": 0 if skip_llm else scan.unscanned,
        "llm_skipped": skip_llm,
    }, indent=2))
    print(f"Approved. Gate recorded in {ws.gate_json}")
    return True


def is_approved(ws: Workspace) -> bool:
    if not ws.gate_json.exists():
        return False
    gate = json.loads(ws.gate_json.read_text())
    return bool(gate.get("approved")) and gate.get("redacted_sha256") == sha256(ws.redacted_md)

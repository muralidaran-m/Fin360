"""Send gate-approved redacted text to Claude and get validated policy facts back.

This is the only code path that talks to a cloud model, and it reads nothing but
redacted.md, after checking (1) the gate approved these exact bytes, (2) no deny-list item
appears in them, and (3) no identifier pattern matches outside a placeholder.
"""
from __future__ import annotations

import json
import re

import anthropic

from . import gate
from .denylist import DenyItem
from .recognizers import detect_patterns
from .schema import Extraction, Plan, PlanPolicy
from .workspace import Workspace

MODEL = "claude-opus-5-5"

SYSTEM = """You extract facts from Indian life-insurance and mutual-fund policy documents for a
personal finance dashboard. Personal details were removed before you see the text and replaced
by placeholders in square brackets ([POLICYHOLDER], [CHILD], [NOMINEE], [PAN], [ADDRESS], ...).
A date of birth appears as "[DOB, age N at commencement]".

Rules:
- Use only what the document states. If a field is not stated, use null (or an empty list).
- Dates as YYYY-MM-DD. Amounts in rupees as plain numbers (10,00,000 -> 1000000).
- If a vesting or maturity date is not printed but can be derived (commencement date plus the
  policy term, or vesting age minus age at entry), derive it and say so in caveats.
- Benefit illustrations at 4%/8% are not guaranteed: mark those payouts guaranteed=false and
  set illustrativeOnly=true when the document's payout figures are projections.
- Refer to people by role ("you", "your child", "the nominee"). Never copy a placeholder into
  the output, and never guess at a removed value."""


def _leftover_identifiers(text: str) -> list[str]:
    """Identifier patterns still matching outside placeholders (should be none)."""
    hits = []
    for s in detect_patterns(text):
        before = text[: s.start]
        if before.rfind("[") <= before.rfind("]"):
            hits.append(s.kind)
    return hits


def preflight(ws: Workspace, deny_items: list[DenyItem]) -> str:
    if not gate.is_approved(ws):
        raise SystemExit("Not sent: redacted.md is not gate-approved (or changed since). Run `policy-ingest gate`.")
    text = ws.redacted_md.read_text(encoding="utf-8")
    if gate.denylist_survivors(deny_items, text):
        raise SystemExit("Not sent: a deny-list item appears in redacted.md.")
    leftovers = _leftover_identifiers(text)
    if leftovers:
        raise SystemExit(f"Not sent: identifier patterns outside placeholders ({', '.join(sorted(set(leftovers)))}).")
    return text


def extract(ws: Workspace, deny_items: list[DenyItem], model: str = MODEL) -> Extraction:
    text = preflight(ws, deny_items)
    client = anthropic.Anthropic()
    response = client.beta.messages.parse(
        model=model,
        max_tokens=16000,
        system=SYSTEM,
        output_config={"effort": "high"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": f"<document>\n{text}\n</document>"}],
        output_format=Extraction,
    )
    if response.stop_reason == "refusal" or response.parsed_output is None:
        raise SystemExit(f"Claude did not return an extraction (stop_reason={response.stop_reason}).")
    extraction = response.parsed_output
    ws.extraction_json.write_text(extraction.model_dump_json(indent=2))
    return extraction


def _policy_no_last4(ws: Workspace) -> str | None:
    vault = json.loads(ws.vault_json.read_text())
    for placeholder in vault:
        if m := re.fullmatch(r"\[POLICY_NO(?:_\d+)? ending (\w{1,4})\]", placeholder):
            return m.group(1)
    return None


def write_plan(ws: Workspace, extraction: Extraction) -> Plan:
    plan = Plan(
        policy=PlanPolicy(nickname=ws.nickname, policyNoLast4=_policy_no_last4(ws), **extraction.policy.model_dump()),
        payouts=extraction.payouts,
    )
    ws.plan_json.write_text(plan.model_dump_json(indent=2))
    return plan

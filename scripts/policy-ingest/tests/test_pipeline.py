"""Gate, pre-send checks and plan writing, without calling the Claude API."""
import json
import os
import subprocess
import sys

import pytest

from policy_ingest import claude_extract, gate, guard, llm
from policy_ingest.extract import Page
from policy_ingest.redact import redact
from policy_ingest.schema import Extraction
from policy_ingest.workspace import Workspace

TEXT = (
    "Policy No: 23456789 Date of Commencement: 10/01/2020\n"
    "Name of the Policyholder: Zubin Mehta Kaur\n"
    "PAN: ABCPK1234Z Mobile: 9876543210\n"
    "Vesting Age: 60 Age at Entry: 40 Premium: Rs. 50,000 yearly for 20 years\n"
)


@pytest.fixture
def ws(tmp_path):
    ws = Workspace(tmp_path, "pension")
    ws.dir.mkdir(parents=True)
    result = redact([Page(1, TEXT, "text")], use_ner=False)
    ws.redacted_md.write_text(result.redacted)
    ws.vault_json.write_text(json.dumps(result.vault))
    return ws


def approve(ws):
    gate.run(ws, [], skip_llm=True, assume_yes=True)


def test_extract_refuses_without_gate(ws):
    with pytest.raises(SystemExit, match="not gate-approved"):
        claude_extract.preflight(ws, [])


def test_gate_approval_is_bound_to_exact_text(ws):
    approve(ws)
    assert claude_extract.preflight(ws, [])
    ws.redacted_md.write_text(ws.redacted_md.read_text() + "\nedited later")
    with pytest.raises(SystemExit, match="not gate-approved"):
        claude_extract.preflight(ws, [])


def test_preflight_blocks_identifier_outside_placeholder(ws):
    ws.redacted_md.write_text(ws.redacted_md.read_text() + "\nCall me on 9123456780")
    approve(ws)
    with pytest.raises(SystemExit, match="PHONE"):
        claude_extract.preflight(ws, [])


def test_plan_carries_last4_but_no_names(ws):
    extraction = Extraction.model_validate({
        "policy": {
            "insurer": "LIC of India", "planName": "New Pension Plus", "type": "retirement",
            "startDate": "2020-01-10", "premiumAmount": 50000, "premiumFrequency": "annual",
            "premiumPayingTermYrs": 20, "policyTermYrs": 20, "maturityDate": None,
            "vestingDate": "2040-01-10", "sumAssured": None, "lockInYrs": None, "riders": [],
            "benefits": ["Pension starts at 60."], "summary": "A pension plan.", "illustrativeOnly": False,
        },
        "payouts": [],
        "caveats": [],
    })
    plan = claude_extract.write_plan(ws, extraction)
    assert plan.policy.policyNoLast4 == "6789"
    written = ws.plan_json.read_text()
    assert "Zubin" not in written and "ABCPK1234Z" not in written


def test_llm_refuses_remote_host():
    with pytest.raises(SystemExit, match="non-local"):
        llm.scan("x", url="http://example.com:8080")


def test_cli_refuses_private_paths_inside_claude_code():
    target = guard.PRIVATE_DIR / "policies" / "inbox" / "x.pdf"
    env = {**os.environ, "CLAUDECODE": "1"}
    r = subprocess.run(
        [sys.executable, "-m", "policy_ingest.cli", "redact", str(target)],
        env=env, capture_output=True, text=True,
    )
    assert r.returncode != 0 and "Refusing to run" in r.stderr


@pytest.mark.skipif(not llm.healthy(), reason="llama-server not running")
def test_local_model_flags_unredacted_name():
    findings = llm.scan("Witness: Farhan Siddiqui, Kochi\nPremium: Rs. 1,00,000 Annual")
    assert any("Farhan" in f["text"] for f in findings)

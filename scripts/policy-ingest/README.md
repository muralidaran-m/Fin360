# policy-ingest

Turns policy PDFs into Fin360 plan JSON without any personal data reaching a cloud model.

```
PDF ─► text (pdfplumber, OCR fallback) ─► redaction (regex + labels + Presidio + deny-list)
    ─► gate (deny-list check, local Qwen scan via llama-server, your approval)
    ─► Claude extraction on the approved redacted text only ─► private/policies/<nickname>.plan.json
```

## One-time setup

```bash
cd scripts/policy-ingest
uv sync
```

Create `private/pii-denylist.txt` at the project root (gitignored), one item per line:

```
name: <your full name>
name: <spouse / child / nominee names>
pan: <your PAN>
phone: <mobile>
email: <email>
address: <a distinctive part of each address line>
dob: <date of birth as printed>
```

These items are used for two things: the final safety net, and measuring how well the detectors work on your real documents.

For scanned PDFs, also run `brew install ocrmypdf`.

## Each document

Run these in your own terminal. Claude Code is blocked from `private/`.

```bash
uv run policy-ingest serve            # in a second terminal; local model on 127.0.0.1:8080
uv run policy-ingest run ../../private/policies/inbox/pension.pdf --nickname pension
```

`run` performs four steps:

1. **redact**: writes `private/policies/work/pension/` (`redacted.md`, `vault.json`, `review.html`).
2. **audit**: prints a report that contains no personal values.
3. **gate**: checks the deny-list, runs the local-model scan, and then you type `approve` after looking at `review.html`.
4. **extract**: sends the approved text to Claude and writes `private/policies/pension.plan.json`.

Check the plan JSON against your PDF, then apply it from the project root with `npm run policy:apply -- --plan=private/policies/pension.plan.json`.

Extraction needs `ANTHROPIC_API_KEY`, or an `ant auth login` profile. It uses `claude-opus-5-5` with server-side refusal fallback enabled.

## Improving redaction without sharing documents

- **Share only the audit output.** If the audit shows misses, paste its output (after reading it) to the coding agent: `uv run policy-ingest audit pension --llm`. It shows counts and value shapes such as `Nominee : Xxxxx Xxxxx`, never the values themselves.
- **Describe misses with fake values.** For example: "a nominee name in a table under 'Relationship' was missed". The agent turns it into a synthetic test case.
- **Run the tests.** `uv run pytest` checks recall per PII type on the synthetic documents (`tests/synth/`). Print the per-type table with `uv run python -m tests.synth.evaluate`.

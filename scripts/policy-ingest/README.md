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

Copy [`pii-denylist.example.txt`](pii-denylist.example.txt) to `private/pii-denylist.txt` at the project root (gitignored) and replace the fake values with your own. Each line is one item:

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

Run these from the project root (`fin360/`) in your own terminal. Claude Code is blocked from `private/`. The npm script wraps `uv run --project scripts/policy-ingest policy-ingest`, so paths stay relative to the root. Plain `uv run policy-ingest` only works from inside `scripts/policy-ingest`.

```bash
npm run policy:ingest -- serve        # in a second terminal; local model on 127.0.0.1:8080
npm run policy:ingest -- run private/policies/inbox/pension.pdf --nickname pension
```

`run` performs four steps:

1. **redact**: writes `private/policies/work/pension/` (`redacted.md`, `vault.json`, `review.html`).
2. **audit**: prints a report that contains no personal values.
3. **gate**: checks the deny-list, runs the local-model scan, and then you type `approve` after looking at `review.html`.
4. **extract**: sends the approved text to Claude and writes `private/policies/pension.plan.json`.

Check the plan JSON against your PDF, then apply it from the project root with `npm run policy:apply -- --plan=private/policies/pension.plan.json`.

The local model defaults to `~/projects/llama.cpp/models/Qwen3-4B-Instruct-2507-Q4_K_M.gguf`, falling back to `Qwen3-1.7B-Q8_0.gguf` when the 4B file is missing; pass `--model` to `serve` to choose another. Compare models on fake data with `uv run python -m tests.synth.llm_bench <model.gguf> ...`. On that benchmark the 4B model caught 76% of planted leftovers vs 35% for 1.7B.

Extraction needs `ANTHROPIC_API_KEY`, or an `ant auth login` profile. It uses `claude-opus-5-5` with server-side refusal fallback enabled.

## Improving redaction without sharing documents

- **Share only the audit output.** If the audit shows misses, paste its output (after reading it) to the coding agent: `npm run policy:ingest -- audit pension --llm`. It shows counts and value shapes such as `Nominee : Xxxxx Xxxxx`, never the values themselves.
- **Describe misses with fake values.** For example: "a nominee name in a table under 'Relationship' was missed". The agent turns it into a synthetic test case.
- **Run the tests.** `uv run pytest` checks recall per PII type on the synthetic documents (`tests/synth/`). Print the per-type table with `uv run python -m tests.synth.evaluate`.

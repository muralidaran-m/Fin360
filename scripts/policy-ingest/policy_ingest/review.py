"""Local side-by-side review page: original text with every redaction highlighted, next
to the redacted text that would be sent. Open it in a browser on your machine only."""
from __future__ import annotations

from html import escape
from pathlib import Path

from .redact import RedactionResult

_CSS = """
body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:0;background:#fafafa;color:#222}
header{padding:12px 20px;background:#222;color:#fff}
main{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px}
pre{white-space:pre-wrap;background:#fff;border:1px solid #ddd;border-radius:6px;padding:12px;margin:0}
h2{font-size:13px;text-transform:uppercase;color:#666;margin:0 0 6px}
mark{background:#ffe08a;border-radius:3px}
mark.ner,mark.propagated{background:#ffc6c6}
mark.denylist{background:#c6d8ff}
.ph{color:#0a6;font-weight:600}
"""


def write_review(result: RedactionResult, path: Path, findings: list[dict] | None = None) -> None:
    parts, pos = [], 0
    for s in result.spans:
        parts.append(escape(result.original[pos : s.start]))
        title = escape(f"{s.meta.get('placeholder')} · {s.kind} via {s.source}")
        parts.append(f'<mark class="{s.source}" title="{title}">{escape(result.original[s.start:s.end])}</mark>')
        pos = s.end
    parts.append(escape(result.original[pos:]))
    redacted = escape(result.redacted)
    for ph in result.vault:
        redacted = redacted.replace(escape(ph), f'<span class="ph">{escape(ph)}</span>')
    llm = ""
    if findings:
        items = "".join(f"<li>{escape(f['type'])}: <b>{escape(f['text'])}</b></li>" for f in findings)
        llm = f"<p><b>Local model flagged {len(findings)} possible leftovers:</b></p><ul>{items}</ul>"
    path.write_text(
        f"<!doctype html><meta charset=utf-8><title>Redaction review</title><style>{_CSS}</style>"
        "<header>Redaction review (local file, contains personal data: do not share)."
        " Yellow: rule or label. Red: name model or repeated name. Blue: deny-list.</header>"
        f"<main><div>{llm}<h2>Original</h2><pre>{''.join(parts)}</pre></div>"
        f"<div><h2>Will be sent to Claude</h2><pre>{redacted}</pre></div></main>",
        encoding="utf-8",
    )

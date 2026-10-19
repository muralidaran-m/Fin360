"""Local leftover-PII scan through llama.cpp's llama-server (OpenAI-compatible API).

The server is only ever reached on localhost; a non-local URL is refused so redacted text
can never be pointed at a remote endpoint by configuration.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
from pathlib import Path
from urllib.parse import urlparse

from dataclasses import dataclass, field

import httpx
from spacy.lang.en.stop_words import STOP_WORDS

from .lexicon import KEEP_TERMS, LABEL_LEXICON

_MODELS_DIR = Path.home() / "projects/llama.cpp/models"
# Qwen3-4B caught 76% of planted leftovers vs 35% for Qwen3-1.7B on tests/synth/llm_bench.py.
DEFAULT_MODEL = next(
    (p for p in (_MODELS_DIR / "Qwen3-4B-Instruct-2507-Q4_K_M.gguf", _MODELS_DIR / "Qwen3-1.7B-Q8_0.gguf") if p.exists()),
    _MODELS_DIR / "Qwen3-4B-Instruct-2507-Q4_K_M.gguf",
)
BASE_URL = os.environ.get("POLICY_LLM_URL", "http://127.0.0.1:8080")
CHUNK_CHARS = 2000
CHUNK_TIMEOUT = float(os.environ.get("POLICY_LLM_TIMEOUT", "120"))
MAX_FINDINGS_PER_CHUNK = 12

_SCHEMA = {
    "type": "object",
    "properties": {
        "findings": {
            "type": "array",
            "maxItems": MAX_FINDINGS_PER_CHUNK,
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "maxLength": 80},
                    "type": {"type": "string", "enum": ["name", "address", "phone", "email", "id_number", "date_of_birth", "other"]},
                },
                "required": ["text", "type"],
            },
        }
    },
    "required": ["findings"],
}

_PROMPT = """You check document lines for leftover personal information before they are shared.
Personal details were already replaced by placeholders in square brackets such as
[POLICYHOLDER], [PAN], [ADDRESS]. Ignore placeholders.

Report every remaining value that identifies a private individual: any person's name (including
witnesses, agents, doctors, family members), a street address or locality, a phone number, an
email address, a government or account ID number, or a date of birth. Do NOT report insurance
company names, plan or fund names, amounts, percentages, terms, or field labels.
Copy each finding exactly as it appears. If there is nothing, return an empty list.

Example lines:
Proposer: [POLICYHOLDER]  Witness: Suresh Pillai, 14 Lake Road, Madurai
Plan: Jeevan Labh  Premium: Rs. 24,000
Example answer:
{{"findings": [{{"text": "Suresh Pillai", "type": "name"}}, {{"text": "14 Lake Road, Madurai", "type": "address"}}]}}

Lines to check:
<<<
{chunk}
>>>"""


def _check_local(url: str) -> None:
    host = urlparse(url).hostname
    if host not in {"127.0.0.1", "localhost", "::1"}:
        raise SystemExit(f"Refusing to send text to non-local LLM host {host!r}.")


def healthy(url: str = BASE_URL) -> bool:
    _check_local(url)
    try:
        return httpx.get(f"{url}/health", timeout=2).status_code == 200
    except httpx.HTTPError:
        return False


def serve(model: Path = DEFAULT_MODEL, port: int = 8080, wait: float = 120) -> subprocess.Popen:
    """Start llama-server bound to localhost and wait until it answers /health."""
    binary = shutil.which("llama-server")
    if binary is None:
        raise SystemExit("llama-server not found on PATH (expected /usr/local/bin/llama-server).")
    if not model.exists():
        raise SystemExit(f"Model not found: {model}")
    proc = subprocess.Popen(
        [binary, "-m", str(model), "--host", "127.0.0.1", "--port", str(port), "-c", "8192", "-np", "1", "--jinja"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    url = f"http://127.0.0.1:{port}"
    deadline = time.time() + wait
    while time.time() < deadline:
        if proc.poll() is not None:
            raise SystemExit("llama-server exited during startup.")
        if healthy(url):
            return proc
        time.sleep(1)
    proc.terminate()
    raise SystemExit("llama-server did not become healthy in time.")


_PLACEHOLDER = re.compile(r"\[[^\]]*\]")
_EMAIL = re.compile(r"[\w.+\-]+@[\w\-]+\.\w")
# Known labels, brand words and English stop words ("EVERY", "FROM" in all-caps headings).
# A full dictionary is deliberately not used: it contains Indian names such as "harish".
_KNOWN = LABEL_LEXICON | KEEP_TERMS | set(STOP_WORDS)


def _unknown_word(text: str) -> bool:
    """A capitalised or all-caps word that is not a known label or brand word."""
    for w in re.findall(r"[A-Za-z][A-Za-z'\-]{2,}", _PLACEHOLDER.sub(" ", text)):
        if w[0].isupper() and re.sub(r"'s$", "", w.lower()).strip("'") not in _KNOWN:
            return True
    return False


def _suspicious(line: str) -> bool:
    """Lines worth showing the model: an unfamiliar name-like word, a long digit run
    that is not a formatted amount, or an @. Tables of amounts and labels are skipped."""
    bare = _PLACEHOLDER.sub(" ", line)
    return bool(_EMAIL.search(bare)) or bool(re.search(r"(?<![\d,.])\d{6,}(?![\d,.])", bare)) or _unknown_word(bare)


def _plausible(text: str) -> bool:
    return bool(_EMAIL.search(text)) or bool(re.search(r"(?<![\d,.])\d{6,}(?![\d,.])", text)) or _unknown_word(text)


def _chunks(text: str) -> list[str]:
    out, buf = [], ""
    for line in (ln for ln in text.split("\n") if _suspicious(ln)):
        if len(buf) + len(line) > CHUNK_CHARS and buf:
            out.append(buf)
            buf = ""
        buf += line + "\n"
    if buf.strip():
        out.append(buf)
    return out


@dataclass
class ScanResult:
    findings: list[dict] = field(default_factory=list)
    chunks: int = 0
    unscanned: int = 0  # chunks that timed out or returned unusable output


def scan(redacted: str, url: str = BASE_URL, progress: bool = False) -> ScanResult:
    """Ask the local model for leftover PII in the lines that could contain any. Only
    findings that literally occur in the text, outside placeholders, and look like a value
    rather than a label are kept."""
    _check_local(url)
    chunks = _chunks(redacted)
    result = ScanResult(chunks=len(chunks))
    for i, chunk in enumerate(chunks, 1):
        started = time.time()
        try:
            resp = httpx.post(
                f"{url}/v1/chat/completions",
                json={
                    "messages": [{"role": "user", "content": _PROMPT.format(chunk=chunk) + "\n/no_think"}],
                    "temperature": 0,
                    "max_tokens": 800,
                    "response_format": {"type": "json_schema", "json_schema": {"name": "findings", "schema": _SCHEMA}},
                    "chat_template_kwargs": {"enable_thinking": False},
                },
                timeout=CHUNK_TIMEOUT,
            )
            resp.raise_for_status()
            items = json.loads(resp.json()["choices"][0]["message"]["content"]).get("findings", [])
        except (httpx.TimeoutException, json.JSONDecodeError, KeyError):
            result.unscanned += 1
            if progress:
                print(f"  chunk {i}/{len(chunks)}: not scanned (timeout or unusable output)", flush=True)
            continue
        kept = 0
        for item in items:
            text = str(item.get("text", "")).strip()
            if len(text) < 3 or "[" in text or "]" in text or not _plausible(text):
                continue
            if re.search(re.escape(text), chunk) and not _inside_placeholder(chunk, text):
                result.findings.append({"text": text, "type": item.get("type", "other")})
                kept += 1
        if progress:
            print(f"  chunk {i}/{len(chunks)}: {time.time() - started:.0f}s, {kept} flagged", flush=True)
    result.findings = list({(f["text"], f["type"]): f for f in result.findings}.values())
    return result


def _inside_placeholder(chunk: str, text: str) -> bool:
    return all(
        chunk.rfind("[", 0, m.start()) > chunk.rfind("]", 0, m.start())
        for m in re.finditer(re.escape(text), chunk)
    )

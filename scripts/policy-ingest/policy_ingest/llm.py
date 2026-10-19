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

import httpx

from .lexicon import LABEL_LEXICON

DEFAULT_MODEL = Path.home() / "projects/llama.cpp/models/Qwen3-1.7B-Q8_0.gguf"
BASE_URL = os.environ.get("POLICY_LLM_URL", "http://127.0.0.1:8080")
CHUNK_CHARS = 2500

_SCHEMA = {
    "type": "object",
    "properties": {
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "type": {"type": "string", "enum": ["name", "address", "phone", "email", "id_number", "date_of_birth", "other"]},
                },
                "required": ["text", "type"],
            },
        }
    },
    "required": ["findings"],
}

_PROMPT = """You check documents for leftover personal information before they are shared.
Personal details have already been replaced by placeholders in square brackets such as
[POLICYHOLDER], [PAN], [ADDRESS]. Ignore placeholders.

List every remaining piece of text that identifies a private individual: a person's name,
a street address or locality, a phone number, an email address, a government or account ID
number, or a date of birth. Do NOT list insurance company names, plan or fund names, amounts,
percentages, policy terms, or generic words. Copy each finding exactly as it appears.
If there is nothing, return an empty list.

Text:
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
        [binary, "-m", str(model), "--host", "127.0.0.1", "--port", str(port), "-c", "8192", "--jinja"],
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


def _chunks(text: str) -> list[str]:
    out, buf = [], ""
    for para in text.split("\n"):
        if len(buf) + len(para) > CHUNK_CHARS and buf:
            out.append(buf)
            buf = ""
        buf += para + "\n"
    if buf.strip():
        out.append(buf)
    return out


def scan(redacted: str, url: str = BASE_URL) -> list[dict]:
    """Ask the local model for leftover PII. Only findings that literally occur in the text
    and are not inside a placeholder are kept, which filters out hallucinations."""
    _check_local(url)
    findings: list[dict] = []
    for chunk in _chunks(redacted):
        resp = httpx.post(
            f"{url}/v1/chat/completions",
            json={
                "messages": [{"role": "user", "content": _PROMPT.format(chunk=chunk) + "\n/no_think"}],
                "temperature": 0,
                "response_format": {"type": "json_schema", "json_schema": {"name": "findings", "schema": _SCHEMA}},
                "chat_template_kwargs": {"enable_thinking": False},
            },
            timeout=300,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        try:
            items = json.loads(content).get("findings", [])
        except json.JSONDecodeError:
            continue
        for item in items:
            text = str(item.get("text", "")).strip()
            if len(text) < 3 or "[" in text or "]" in text:
                continue
            if all(w.strip(".,:;()").lower() in LABEL_LEXICON for w in text.split()):
                continue  # a field label such as "PAN" or "Date of Birth", not a value
            if re.search(re.escape(text), chunk) and not _inside_placeholder(chunk, text):
                findings.append({"text": text, "type": item.get("type", "other")})
    unique = {(f["text"], f["type"]): f for f in findings}
    return list(unique.values())


def _inside_placeholder(chunk: str, text: str) -> bool:
    return all(
        chunk.rfind("[", 0, m.start()) > chunk.rfind("]", 0, m.start())
        for m in re.finditer(re.escape(text), chunk)
    )

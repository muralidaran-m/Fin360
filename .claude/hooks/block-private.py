#!/usr/bin/env python3
"""PreToolUse guard: keep the coding agent away from private/ (real policy PDFs, PII vault).

Blocks any Bash command that references the project's private/ folder. File tools are
covered separately by permissions.deny rules in .claude/settings.json.
"""
import json
import re
import sys

# Matches "private/..." as a relative path, ".../fin360/private", or a bare "private" used
# as a path argument (followed by end of command, a quote or a shell operator). Does not
# match macOS system paths like /private/tmp (the agent's scratchpad lives there) or the
# English word in prose ("a private individual").
PATTERN = re.compile(
    r"fin360/private\b"
    r"|(^|[\s'\"=:(;|&<>])(\./)?private/"
    r"|(^|[\s'\"=:(;|&<>])(\./)?private\s*($|['\";|&<>)])"
)


def main() -> int:
    payload = json.load(sys.stdin)
    command = payload.get("tool_input", {}).get("command", "")
    if PATTERN.search(command):
        print(
            "Blocked: private/ holds real policy documents with PII. The coding agent must not "
            "read or process it. Ask the user to run this command in their own terminal.",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())

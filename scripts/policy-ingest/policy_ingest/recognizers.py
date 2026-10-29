"""Deterministic PII detectors for Indian insurance and mutual-fund documents.

Each detector returns Spans over the full document text. Recall matters more than
precision here: a missed identifier leaks, an over-redacted word only costs context.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date

from .lexicon import COMMON_WORDS, KEEP_TERMS


@dataclass
class Span:
    start: int
    end: int
    kind: str  # PAN, AADHAAR, PHONE, EMAIL, IFSC, POLICY_NO, ACCOUNT_NO, FOLIO, CUSTOMER_ID,
    #            AGENT_CODE, LONG_NUMBER, PINCODE, DOB, ADDRESS, PERSON
    source: str  # regex | label | address | ner | propagated | denylist
    role: str | None = None  # PERSON only: POLICYHOLDER, LIFE_ASSURED, CHILD, NOMINEE, ...
    meta: dict = field(default_factory=dict)

    @property
    def length(self) -> int:
        return self.end - self.start


# --- Verhoeff checksum (Aadhaar) ---------------------------------------------------------

_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]


def verhoeff_valid(digits: str) -> bool:
    c = 0
    for i, ch in enumerate(reversed(digits)):
        c = _D[c][_P[i % 8][int(ch)]]
    return c == 0


def verhoeff_check_digit(digits: str) -> str:
    c = 0
    for i, ch in enumerate(reversed(digits)):
        c = _D[c][_P[(i + 1) % 8][int(ch)]]
    return str(_INV[c])


# --- Pattern detectors -------------------------------------------------------------------

SEP = r"\s*(?:[:;\-–.]|is)?\s*"

_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("EMAIL", re.compile(r"\b[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+\b")),
    ("PAN", re.compile(r"\b[A-Za-z]{5}\d{4}[A-Za-z]\b")),
    ("PAN", re.compile(r"\b[A-Z]{5}[ \-]\d{4}[ \-]?[A-Z]\b|\b[A-Z]{5}\d{4}[ \-][A-Z]\b")),
    ("AADHAAR", re.compile(r"\b(?:[Xx*]{4}[ \-]?){2}\d{4}\b")),
    ("IFSC", re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")),
    ("PHONE", re.compile(r"(?<![\d\w])(?:\+91[ \-]?|91[ \-]|0)?[6-9]\d{4}[ \-]?\d{5}(?!\d)")),
    ("PHONE", re.compile(r"(?<![\d\w])(?:\+91[ \-]?)?[6-9]\d{2}[ \-]\d{3}[ \-]\d{4}(?!\d)")),
    ("PHONE", re.compile(r"(?<![\d\w])0\d{2,4}[ \-]\d{6,8}(?!\d)")),
    ("PINCODE", re.compile(r"(?i)\bpin\s*(?:code)?" + SEP + r"([1-9]\d{2}\s?\d{3})\b")),
]

_AADHAAR_RE = re.compile(r"(?<!\d)([2-9]\d{3})[ \-]?(\d{4})[ \-]?(\d{4})(?!\d)")
# Unformatted 9-18 digit runs (account numbers, policy numbers without a label, etc.).
# Amounts are written with commas or decimals in these documents, so they are not hit.
_LONG_NUMBER_RE = re.compile(r"(?<![\d,.₹])(?<!Rs\.)(?<!Rs )\b\d{9,18}\b(?![,.]\d)")


def detect_patterns(text: str) -> list[Span]:
    spans = []
    for kind, rx in _PATTERNS:
        for m in rx.finditer(text):
            s, e = (m.start(1), m.end(1)) if m.groups() else (m.start(), m.end())
            spans.append(Span(s, e, kind, "regex"))
    for m in _AADHAAR_RE.finditer(text):
        if verhoeff_valid("".join(m.groups())):
            spans.append(Span(m.start(), m.end(), "AADHAAR", "regex"))
    for m in _LONG_NUMBER_RE.finditer(text):
        spans.append(Span(m.start(), m.end(), "LONG_NUMBER", "regex"))
    return spans


# --- Labelled identifiers ------------------------------------------------------------------

_ID_LABELS: list[tuple[str, str]] = [
    ("POLICY_NO", r"(?:master\s+)?(?:policy|proposal|application|certificate|contract|plan)\s*(?:no\.?|number|num|#)"),
    ("ACCOUNT_NO", r"(?:bank\s+)?(?:a/c|account|acct)\.?\s*(?:no\.?|number|num|#)?"),
    ("FOLIO", r"folio\s*(?:no\.?|number|#)?"),
    ("CUSTOMER_ID", r"(?:client|customer|member|unique|investor)\s*(?:id|code|no\.?|number)|ucic|cif\s*(?:no\.?|id)?|ckyc\s*(?:no\.?|number|id)?|kin|uan|pran|crn"),
    ("AGENT_CODE", r"(?:agent|advisor|adviser|broker|intermediary|sp|distributor)\s*(?:code|licen[cs]e\s*no\.?|id)|arn(?:\s*(?:no\.?|code))?|euin(?:\s*no\.?)?"),
]
_ID_VALUE = r"([A-Z0-9][A-Z0-9/\-]{3,}(?:[ ][0-9]{2,})*)"


def detect_labelled_ids(text: str) -> list[Span]:
    spans = []
    for kind, label in _ID_LABELS:
        rx = re.compile(r"(?i)\b(?:" + label + r")" + SEP + r"(?-i:" + _ID_VALUE + r")")
        for m in rx.finditer(text):
            value = m.group(1)
            if any(ch.isdigit() for ch in value):
                spans.append(Span(m.start(1), m.end(1), kind, "label"))
    return spans


# --- Dates of birth ------------------------------------------------------------------------

_MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split()
_DATE = (
    r"(\d{1,2}[/\-. ]\d{1,2}[/\-. ]\d{2,4}"
    r"|\d{1,2}(?:st|nd|rd|th)?[ \-](?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?[ \-,]+\d{4}"
    r"|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.? \d{1,2},? \d{4})"
)
_DOB_RE = re.compile(r"(?i)\b(?:date\s+of\s+birth|d\.?\s?o\.?\s?b\.?|birth\s+date)(?:\s*\([^)]*\))?" + SEP + _DATE)
_COMMENCEMENT_RE = re.compile(
    r"(?i)\b(?:date\s+of\s+commencement(?:\s+of\s+(?:policy|risk))?|(?:risk\s+)?commencement\s+date|policy\s+start\s+date|date\s+of\s+issue)" + SEP + _DATE
)


def parse_date(raw: str) -> date | None:
    s = raw.strip().lower().replace(",", " ")
    m = re.fullmatch(r"(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{2,4})", s)
    if m:
        d, mo, y = (int(x) for x in m.groups())
        y = y + 2000 if y < 50 else y + 1900 if y < 100 else y
        try:
            return date(y, mo, d)
        except ValueError:
            return None
    tokens = re.findall(r"[a-z]+|\d+", s)
    day = year = month = None
    for t in tokens:
        if t.isdigit():
            if len(t) == 4:
                year = int(t)
            elif day is None:
                day = int(t)
        elif t[:3] in _MONTHS and month is None:
            month = _MONTHS.index(t[:3]) + 1
    if day and month and year:
        try:
            return date(year, month, day)
        except ValueError:
            return None
    return None


def age_on(dob: date, on: date) -> int:
    return on.year - dob.year - ((on.month, on.day) < (dob.month, dob.day))


def detect_dob(text: str) -> list[Span]:
    commencement = None
    if m := _COMMENCEMENT_RE.search(text):
        commencement = parse_date(m.group(1))
    spans = []
    for m in _DOB_RE.finditer(text):
        meta = {}
        dob = parse_date(m.group(1))
        if dob and commencement and commencement > dob:
            meta["age_at_commencement"] = age_on(dob, commencement)
        spans.append(Span(m.start(1), m.end(1), "DOB", "label", meta=meta))
    return spans


# --- People named next to a label ----------------------------------------------------------

_HONORIFIC = r"(?:Mr|Mrs|Ms|Miss|Master|Mast|Dr|Shri|Sri|Smt|Kumari|Km|Baby)\.?"
_NAME_TOKEN = r"[A-Z][A-Za-z'\-]*\.?"
_NAME = rf"((?:{_HONORIFIC}[ ]+)?{_NAME_TOKEN}(?:[ ]{_NAME_TOKEN}){{0,4}})"

_PERSON_LABELS: list[tuple[str, str]] = [
    ("NOMINEE", r"(?:name\s+of\s+(?:the\s+)?)?nominee(?:'?s)?(?:\s*\d)?(?:\s+name)?"),
    ("APPOINTEE", r"(?:name\s+of\s+(?:the\s+)?)?appointee(?:'?s)?(?:\s+name)?"),
    ("GUARDIAN", r"(?:name\s+of\s+(?:the\s+)?)?guardian(?:'?s)?(?:\s+name)?"),
    ("CHILD", r"(?:name\s+of\s+(?:the\s+)?)?(?:child|minor|beneficiary)(?:'?s)?(?:\s+name)?"),
    ("LIFE_ASSURED", r"(?:name\s+of\s+(?:the\s+)?)?(?:life\s+(?:to\s+be\s+)?assured|life\s+insured|insured)(?:'?s)?(?:\s+name)?"),
    ("POLICYHOLDER", r"(?:name\s+of\s+(?:the\s+)?)?(?:proposer|policy\s*holder|policy\s+owner|applicant|investor|account\s+holder|unit\s*holder|first\s+holder|sole\s+holder|holder)(?:'?s)?(?:\s+name)?"),
    ("AGENT", r"(?:name\s+of\s+(?:the\s+)?)?(?:agent|advisor|adviser|intermediary|broker|distributor|relationship\s+manager|sales\s+manager)(?:'?s)?(?:\s+name)?"),
    ("RELATIVE", r"(?:father|mother|husband|spouse|wife)(?:'?s)?\s+name|[SDW]/o"),
    ("PERSON", r"name|dear"),
]
# "Plan Name:", "Scheme Name:", "Bank Name:" label things, not people.
_NON_PERSON_NAME_PREFIX = re.compile(
    r"(?i)\b(?:plan|scheme|product|fund|bank|branch|company|insurer|policy|rider|option|file|user)\s*$"
)
_NOT_NAME = re.compile(r"(?i)^(?:details?|address|relationship|age|date|code|no\.?|number|of|as|is|and|the)\b")


# Words that start the next field on the same line: "Ravi Iyer Date of Birth: ...".
_FIELD_WORDS = COMMON_WORDS | {
    "relationship", "relation", "mobile", "pan", "email", "e-mail", "gender", "sex", "occupation",
    "dob", "phone", "tel", "telephone", "no", "id", "aadhaar", "uid", "ckyc", "dated", "signature",
    "place", "ifsc", "share", "percentage", "nationality", "residential", "status",
}


def _trim_trailing_labels(name: str) -> str:
    tokens = name.split(" ")
    for i, t in enumerate(tokens):
        if i > 0 and t.strip(".").lower() in _FIELD_WORDS:
            tokens = tokens[:i]
            break
    return " ".join(tokens).rstrip()


def _extend_name_across_line(text: str, end: int) -> int:
    """'Proposer: Ravi\\nKumar Iyer' -> include the next line when it is 1-3 capitalised
    words with no label, digits or punctuation (a name wrapped by the PDF layout)."""
    if not text.startswith("\n", end):
        return end
    nxt = text[end + 1 : text.find("\n", end + 1) if "\n" in text[end + 1 :] else len(text)]
    if re.fullmatch(r"[A-Z][A-Za-z'\-]*(?: [A-Z][A-Za-z'\-]*){0,2}", nxt.strip()) and nxt.strip().lower() not in COMMON_WORDS:
        return end + 1 + len(nxt.rstrip())
    return end


def detect_labelled_people(text: str) -> list[Span]:
    spans = []
    for role, label in _PERSON_LABELS:
        rx = re.compile(r"(?i)\b(?:" + label + r")" + r"\s*(?:[:\-–]\s*|\s+)" + r"(?-i:" + _NAME + r")")
        pos = 0
        # search() from the end of each trimmed name rather than finditer(), so a label
        # swallowed by the previous name ("NOMINEE 1 : A B NOMINEE 2 : C D") is still seen.
        while m := rx.search(text, pos):
            name = _trim_trailing_labels(m.group(1))
            pos = m.start(1) + max(len(name), 1)
            if not name or _NOT_NAME.match(name) or name.lower() in COMMON_WORDS:
                continue
            if role == "PERSON" and _NON_PERSON_NAME_PREFIX.search(text[max(0, m.start() - 25) : m.start()]):
                continue
            words = [w.strip(".").lower() for w in name.split()]
            if all(w in COMMON_WORDS or w in KEEP_TERMS for w in words):
                continue
            end = _extend_name_across_line(text, m.start(1) + len(name))
            spans.append(Span(m.start(1), end, "PERSON", "label", role=role))
    # Honorific anywhere in running text: "Mr. Ravi Kumar", "Smt. Lakshmi".
    for m in re.finditer(rf"\b{_HONORIFIC}[ ]+({_NAME_TOKEN}(?:[ ]{_NAME_TOKEN}){{0,3}})", text):
        if m.group(1).split()[0].strip(".").lower() in COMMON_WORDS:
            continue
        spans.append(Span(m.start(), m.end(), "PERSON", "label", role="PERSON"))
    return spans


# --- Name columns in tables ----------------------------------------------------------------

_NAME_HEADER = re.compile(
    r"(?im)^.*\bname\b.*\b(?:relationship|relation|age|share|dob|date of birth|gender)\b.*$"
)
_RELATION_WORDS = {
    "spouse", "wife", "husband", "son", "daughter", "father", "mother", "brother", "sister",
    "child", "minor", "self", "grandson", "granddaughter", "nephew", "niece", "uncle", "aunt",
    "guardian", "male", "female", "others", "other",
}


def detect_table_names(text: str) -> list[Span]:
    """Rows under a 'Name | Relationship | Age | Share' header: the leading capitalised
    words of each row are a person (nominee tables have no per-row label)."""
    spans = []
    for header in _NAME_HEADER.finditer(text):
        before = text[max(0, header.start() - 120) : header.start()].lower()
        role = "NOMINEE" if "nominee" in before or "nominee" in header.group(0).lower() else "PERSON"
        pos = header.end() + 1
        for _ in range(10):
            if pos >= len(text):
                break
            end = text.find("\n", pos)
            end = len(text) if end == -1 else end
            row = text[pos:end]
            tokens = row.split(" ")
            name_tokens = []
            for t in tokens:
                if not re.fullmatch(r"[A-Z][A-Za-z'.\-]*", t) or t.lower() in _RELATION_WORDS:
                    break
                name_tokens.append(t)
            if not row.strip() or not name_tokens or len(name_tokens) == len(tokens):
                break
            name = " ".join(name_tokens)
            spans.append(Span(pos, pos + len(name), "PERSON", "label", role=role))
            pos = end + 1
    return spans


# --- OCR confusions --------------------------------------------------------------------------


def ocr_variants(text: str) -> list[str]:
    """Same-length copies of the text with common OCR confusions undone, so detectors
    can read 'Po1icy No' or '98765 432l0'. Offsets stay identical to the original."""

    def fix(letter_for_one: str) -> str:
        chars = list(text)
        for i in range(1, len(chars) - 1):
            a, c, b = chars[i - 1], chars[i], chars[i + 1]
            if c in "1|" and a.isalpha() and b.isalpha():
                chars[i] = letter_for_one
            elif c == "0" and a.isalpha() and b.isalpha():
                chars[i] = "o"
            elif c in "lI|" and a.isdigit() and b.isdigit():
                chars[i] = "1"
            elif c in "Oo" and a.isdigit() and b.isdigit():
                chars[i] = "0"
        return "".join(chars)

    variants = [fix("l"), fix("i")]
    return [v for v in dict.fromkeys(variants) if v != text]


# --- Address blocks ------------------------------------------------------------------------

_ADDRESS_LABEL = re.compile(
    r"(?im)(?<!email )(?<!e-mail )\b(?:(?:correspondence|communication|permanent|residential|mailing|present|postal|home)\s+)?address(?:\s+for\s+communication)?\s*[:\-–]\s*"
)
_ADDRESS_WORDS = re.compile(
    r"(?i)\b(?:road|rd|street|st|nagar|flat|apartment|apts?|colony|lane|floor|block|sector|phase|main|cross|avenue|layout|salai|plot|house|villa|tower|society|near|opp|behind|village|taluk|district|dist|post|po|ward|marg|chowk|bagh|puram|pet|palya|halli|wadi|vihar|enclave|residency|towers|h\.?\s?no|d\.?\s?no|no\.)\b"
)
_PIN_LINE = re.compile(r"[A-Za-z][A-Za-z .,()]*[,\-–]?\s*[1-9]\d{2}\s?\d{3}\s*\.?$")
_LABEL_LINE = re.compile(r"^[A-Za-z][A-Za-z'/ .()]{1,40}\s*:\s")


def _lines_with_offsets(text: str) -> list[tuple[int, str]]:
    out, pos = [], 0
    for line in text.split("\n"):
        out.append((pos, line))
        pos += len(line) + 1
    return out


def detect_addresses(text: str) -> list[Span]:
    spans = []
    lines = _lines_with_offsets(text)
    starts = [p for p, _ in lines]

    def line_index(offset: int) -> int:
        lo, hi = 0, len(starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if starts[mid] <= offset:
                lo = mid
            else:
                hi = mid - 1
        return lo

    # 1) "Address: ..." followed by continuation lines until a blank line, another label,
    #    a line ending in a PIN code (included), or four lines.
    for m in _ADDRESS_LABEL.finditer(text):
        i = line_index(m.end())
        end = lines[i][0] + len(lines[i][1])
        if _PIN_LINE.search(lines[i][1]):
            spans.append(Span(m.end(), end, "ADDRESS", "address"))
            continue
        for j in range(i + 1, min(i + 5, len(lines))):
            pos, line = lines[j]
            if not line.strip() or _LABEL_LINE.match(line):
                break
            end = pos + len(line)
            if _PIN_LINE.search(line):
                break
        spans.append(Span(m.end(), end, "ADDRESS", "address"))

    # 2) Unlabelled blocks: a short line ending in a PIN code, plus up to three lines above
    #    it that look like address lines.
    for i, (pos, line) in enumerate(lines):
        if len(line) > 90 or not _PIN_LINE.search(line):
            continue
        start = pos
        for j in range(i - 1, max(i - 4, -1), -1):
            prev = lines[j][1]
            if not prev.strip() or len(prev) > 90 or _LABEL_LINE.match(prev):
                break
            if _ADDRESS_WORDS.search(prev) or re.match(r"\s*(?:#|\d)", prev) or prev.rstrip().endswith(","):
                start = lines[j][0]
            else:
                break
        spans.append(Span(start, pos + len(line), "ADDRESS", "address"))
    return spans

"""Name detection with Microsoft Presidio (spaCy en_core_web_lg), filtered for documents
full of brand and plan names."""
from __future__ import annotations

import re
from functools import lru_cache

from .lexicon import COMMON_WORDS, KEEP_TERMS
from .recognizers import Span

MIN_SCORE = 0.5


@lru_cache(maxsize=1)
def _analyzer():
    from presidio_analyzer import AnalyzerEngine
    from presidio_analyzer.nlp_engine import NlpEngineProvider

    provider = NlpEngineProvider(
        nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "en", "model_name": "en_core_web_lg"}],
        }
    )
    return AnalyzerEngine(nlp_engine=provider.create_engine(), supported_languages=["en"])


def _plausible_name(value: str) -> bool:
    if any(ch.isdigit() for ch in value) or "[" in value or "]" in value:
        return False
    words = [w.strip(".,'").lower() for w in re.split(r"\s+", value) if w.strip(".,'")]
    if not words or not any(value_word[:1].isupper() for value_word in value.split()):
        return False
    return not all(w in COMMON_WORDS or w in KEEP_TERMS for w in words)


def detect_people(text: str) -> list[Span]:
    results = _analyzer().analyze(text=text, language="en", entities=["PERSON"], score_threshold=MIN_SCORE)
    spans = []
    for r in results:
        # spaCy sometimes runs an entity across a line break ("Suresh Babu\nDear"); judge
        # each line's piece on its own.
        offset = r.start
        for piece in text[r.start : r.end].split("\n"):
            value = piece.strip()
            if value and _plausible_name(value):
                start = offset + piece.index(value)
                spans.append(Span(start, start + len(value), "PERSON", "ner", role="PERSON"))
            offset += len(piece) + 1
    return spans

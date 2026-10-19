"""Recall/precision gate on the synthetic policy documents (see tests/synth/)."""
import pytest

from tests.synth.evaluate import IDENTIFIER_KINDS, evaluate, report


@pytest.fixture(scope="module")
def score():
    s = evaluate()
    print("\n" + report(s))
    return s


def test_identifier_recall_is_total(score):
    for kind in IDENTIFIER_KINDS & set(score.planted):
        assert score.recall(kind) == 1.0, report(score)


def test_name_and_address_recall(score):
    assert score.recall("name") >= 0.98, report(score)
    assert score.recall("address") >= 0.98, report(score)


def test_plan_facts_survive(score):
    assert score.keep_rate >= 0.95, report(score)

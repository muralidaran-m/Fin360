from datetime import date

from policy_ingest import denylist as dl
from policy_ingest.extract import Page
from policy_ingest.recognizers import (
    detect_labelled_people,
    detect_patterns,
    ocr_variants,
    parse_date,
    verhoeff_check_digit,
    verhoeff_valid,
)
from policy_ingest.redact import redact


def kinds(text: str) -> set[str]:
    return {s.kind for s in detect_patterns(text)}


def test_verhoeff_round_trip():
    body = "23456789012"
    full = body + verhoeff_check_digit(body)
    assert verhoeff_valid(full)
    assert not verhoeff_valid(full[:-1] + str((int(full[-1]) + 1) % 10))


def test_identifiers():
    assert "PAN" in kinds("PAN: ABCPI1234K")
    assert "PAN" in kinds("PAN: ABCPI 1234 K")
    assert "AADHAAR" in kinds("XXXX XXXX 4821")
    assert "PHONE" in kinds("+91 98765 43210")
    assert "PHONE" in kinds("044-24567890")
    assert "EMAIL" in kinds("a.b@example.co.in")
    assert "IFSC" in kinds("IFSC: SBIN0012345")


def test_amounts_and_toll_free_numbers_are_not_pii():
    assert kinds("Premium Rs. 1,00,000 and Sum Assured 10,00,000") == set()
    assert kinds("Call 1800-266-9777 for help") == set()
    assert kinds("Since 2019 a fixed bonus applies") == set()


def test_name_stops_at_next_field():
    text = "Life Assured: Ravi Kumar Iyer Date of Birth: 12/07/1985"
    [span] = [s for s in detect_labelled_people(text) if s.role == "LIFE_ASSURED"]
    assert text[span.start : span.end] == "Ravi Kumar Iyer"


def test_plan_name_label_is_not_a_person():
    assert not [s for s in detect_labelled_people("Plan Name: Sanchay Plus") if s.role == "PERSON"]


def test_dates():
    assert parse_date("12/07/1985") == date(1985, 7, 12)
    assert parse_date("04-Aug-2014") == date(2014, 8, 4)
    assert parse_date("July 12, 1984") == date(1984, 7, 12)


def test_ocr_variants_keep_offsets():
    text = "Po1icy No : 1234567O"
    for v in ocr_variants(text):
        assert len(v) == len(text)
    assert any(v.startswith("Policy") for v in ocr_variants(text))


def test_same_person_gets_one_placeholder_and_dob_becomes_age():
    text = (
        "Date of Commencement: 15/03/2018\n"
        "Name of the Proposer: Mr. Ravi Kumar Iyer\n"
        "Life Assured: Ravi Kumar Iyer Date of Birth: 12/07/1985\n"
        "Dear Mr. Iyer, Ravi can call us any time."
    )
    r = redact([Page(1, text, "text")], use_ner=False)
    assert "Ravi" not in r.redacted and "Iyer" not in r.redacted
    assert r.redacted.count("[POLICYHOLDER]") == 4
    assert "[DOB, age 32 at commencement]" in r.redacted


def test_denylist_catches_what_detectors_miss(tmp_path):
    path = tmp_path / "deny.txt"
    path.write_text("name: Zubin Q Unusual\nphone: 98765 43210\n")
    items = dl.load(path)
    text = "zubin wrote from 9876543210 about the plan"
    r = redact([Page(1, text, "text")], items, use_ner=False)
    assert not dl.find(items, r.redacted)
    assert r.denylist_detector_misses == [1]

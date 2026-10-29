"""Ten synthetic policy documents modelled on Indian insurer and AMC layouts.

Each document records the fake PII planted in it (the answer key) and values that must
survive redaction (plan facts the extraction step needs).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .fake import Faker

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August",
               "September", "October", "November", "December"]


@dataclass
class Doc:
    name: str
    blocks: list[tuple[str, object]] = field(default_factory=list)  # ("lines", [str]) | ("table", [[str]]) | ("page", None)
    pii: list[tuple[str, str]] = field(default_factory=list)  # (kind, value)
    keep: list[str] = field(default_factory=list)

    def lines(self, *lines: str) -> None:
        self.blocks.append(("lines", list(lines)))

    def table(self, rows: list[list[str]]) -> None:
        self.blocks.append(("table", rows))

    def page(self) -> None:
        self.blocks.append(("page", None))

    def plant(self, kind: str, value: str) -> str:
        self.pii.append((kind, value))
        return value

    def plant_address(self, lines: list[str]) -> list[str]:
        for line in lines:
            self.pii.append(("address", line.rstrip(",")))
        return lines


def schedule_kv(f: Faker) -> Doc:
    d = Doc("01_schedule_kv")
    ph = f.person()
    dd, mm, yy = f.dob()
    d.lines(
        "HDFC Life Insurance Company Limited",
        "POLICY SCHEDULE - HDFC Life Sanchay Plus (Non-Linked, Non-Participating)",
        f"Policy No: {d.plant('policy_no', f.digits(8))}    Date of Commencement: 15/03/2018",
        f"Name of the Proposer: Mr. {d.plant('name', ph.full)}",
        f"Life Assured: {ph.full}    Date of Birth: {d.plant('dob', f'{dd:02d}/{mm:02d}/{yy}')}",
        f"PAN: {d.plant('pan', f.pan(ph.last))}    Mobile: +91 {d.plant('phone', f.mobile())}",
        f"Email: {d.plant('email', ph.first.lower() + '.' + ph.last.lower() + '@example.com')}",
    )
    addr = d.plant_address(f.address())
    d.lines(f"Address: {addr[0]}", *addr[1:])
    nominee = f.person(ph.last)
    d.lines(
        f"Nominee Name: {d.plant('name', nominee.full)}    Relationship: Spouse",
        "Premium: Rs. 1,00,000 Annual    Premium Paying Term: 10 years    Policy Term: 20 years",
        "Sum Assured: Rs. 10,00,000    Maturity Date: 15/03/2038",
        f"Agent Code: {d.plant('agent_code', 'AG' + f.digits(6))}    Agent Name: {d.plant('name', f.person().full)}",
    )
    d.keep += ["HDFC Life", "Sanchay Plus", "15/03/2018", "1,00,000", "10 years", "20 years", "10,00,000", "15/03/2038"]
    return d


def child_plan_nominee_table(f: Faker) -> Doc:
    d = Doc("02_child_plan_nominee_table")
    parent = f.person()
    child = f.person(parent.last)
    d.lines(
        "ICICI Prudential Life Insurance - ICICI Pru Smart Kid Assure",
        f"Policy Number: {d.plant('policy_no', f.digits(8))}",
        f"Policyholder: {d.plant('name', parent.full)}",
        f"Name of the Child: {d.plant('name', child.full)}    Date of Birth (Child): {d.plant('dob', '04-Aug-2014')}",
        "Date of Commencement: 01/06/2019    Premium Payment Term: 12 years    Policy Term: 18 years",
        "Annualised Premium: Rs. 60,000    Sum Assured on Death: Rs. 6,00,000",
        "Waiver of Premium: future premiums are paid by the company on death of the policyholder.",
        "Nominee Details",
    )
    n1, n2 = f.person(parent.last), f.person()
    d.table([
        ["Name", "Relationship", "Age", "Share %"],
        [d.plant("name", n1.full), "Spouse", "38", "60%"],
        [d.plant("name", n2.full), "Brother", "41", "40%"],
    ])
    d.lines("Loyalty additions are payable from the 10th policy year onwards.")
    d.keep += ["Smart Kid Assure", "01/06/2019", "12 years", "18 years", "60,000", "6,00,000", "10th policy year"]
    return d


def ulip_illustration(f: Faker) -> Doc:
    d = Doc("03_ulip_illustration")
    ph = f.person()
    d.lines(
        "Benefit Illustration - SBI Life Smart Wealth Builder (Unit Linked)",
        f"Proposal No: {d.plant('policy_no', 'PR' + f.digits(9))}",
        f"Proposer: {d.plant('name', ph.full)}    Age: 34    Gender: Male",
        "Annual Premium: Rs. 1,20,000    Premium Paying Term: 10    Policy Term: 15",
        "Illustrative values at assumed gross investment returns of 4% and 8% p.a.",
    )
    rows = [["Policy Year", "Premium", "Fund Value @4%", "Fund Value @8%", "Death Benefit"]]
    fv4, fv8 = 0, 0
    for year in range(1, 16):
        prem = 120000 if year <= 10 else 0
        fv4 = int((fv4 + prem) * 1.025)
        fv8 = int((fv8 + prem) * 1.065)
        rows.append([str(year), f"{prem:,}", f"{fv4:,}", f"{fv8:,}", f"{max(fv8, 1200000):,}"])
    d.table(rows)
    d.keep += ["Smart Wealth Builder", "1,20,000", "4%", "8%", rows[15][3], rows[10][2]]
    d.lines("The values shown are not guaranteed and depend on future fund performance.")
    return d


def pension_annuity(f: Faker) -> Doc:
    d = Doc("04_pension_annuity")
    ph = f.person()
    pan = f.pan(ph.last)
    spaced_pan = f"{pan[:5]} {pan[5:9]} {pan[9]}"
    aadhaar = f.aadhaar()
    acct = f.digits(14)
    d.lines(
        "LIC of India - LIC's New Pension Plus (Plan 867)",
        f"Policy No.: {d.plant('policy_no', f.digits(9))}",
        f"Name of the Policyholder: {d.plant('name', ph.full)}",
        f"PAN: {d.plant('pan', spaced_pan)}",
        f"Aadhaar (masked): XXXX XXXX {d.plant('aadhaar', aadhaar[-4:])}",
        f"Aadhaar: {d.plant('aadhaar', aadhaar[:4] + ' ' + aadhaar[4:8] + ' ' + aadhaar[8:])}",
        "Date of Commencement: 10/01/2020    Vesting Age: 60    Age at Entry: 40",
        "Vesting Date: 10/01/2040    Premium: Rs. 50,000 yearly for 20 years",
        "On vesting, the policyholder may commute up to 60% and buy an annuity with the balance.",
        "Payout Bank Details",
        f"Bank Account No: {d.plant('account_no', acct)}    IFSC: {d.plant('ifsc', 'SBIN0' + f.digits(6))}",
        "Bank: State Bank of India, T Nagar Branch",
    )
    d.keep += ["New Pension Plus", "10/01/2020", "Vesting Age: 60", "10/01/2040", "50,000", "60%"]
    return d


def premium_receipt(f: Faker) -> Doc:
    d = Doc("05_premium_receipt")
    ph = f.person()
    addr = f.address()
    d.lines("Max Life Insurance Co. Ltd.", "PREMIUM RECEIPT")
    d.lines(f"Mr. {d.plant('name', ph.full)}", *d.plant_address(addr))
    d.lines(
        f"Receipt No: R{f.digits(10)}    Date: 12/02/2025",
        f"Policy No: {d.plant('policy_no', f.digits(9))}    Plan: Max Life Smart Fixed-return Digital Plan",
        f"Received with thanks from {ph.full} the sum of Rs. 75,000 towards renewal premium.",
        "Next premium due date: 12/02/2026    Mode: Yearly",
        f"Contact: {d.plant('phone', '044-' + f.digits(8))}",
    )
    d.keep += ["Smart Fixed-return", "75,000", "12/02/2026", "Yearly"]
    return d


def mf_statement(f: Faker) -> Doc:
    d = Doc("06_mf_statement")
    ph = f.person()
    addr = [line.upper() for line in f.address()]
    mobile = f.mobile()
    d.lines(
        "Consolidated Account Statement",
        f"{d.plant('name', ph.full.upper())}",
        *d.plant_address(addr),
        f"Email Id: {d.plant('email', ph.first.lower() + '123@example.in')}    Mobile: {d.plant('phone', mobile[:5] + ' ' + mobile[5:])}",
        f"PAN: {d.plant('pan', f.pan(ph.last))}    KYC: OK",
        f"Folio No: {d.plant('folio', f.digits(8) + '/' + f.digits(2))}",
        "HDFC Retirement Savings Fund - Equity Plan - Direct Growth",
    )
    d.table([
        ["Date", "Transaction", "Amount", "NAV", "Units"],
        ["05-Jan-2025", "SIP Purchase", "10,000.00", "48.2310", "207.334"],
        ["05-Feb-2025", "SIP Purchase", "10,000.00", "47.9120", "208.716"],
    ])
    d.lines("Closing Unit Balance: 3,412.552    Market Value: Rs. 1,64,210.35",
            "Lock-in: 5 years or retirement age, whichever is earlier")
    d.keep += ["HDFC Retirement Savings Fund", "10,000.00", "48.2310", "1,64,210.35", "5 years"]
    return d


def welcome_letter(f: Faker) -> Doc:
    d = Doc("07_welcome_letter")
    ph = f.person()
    agent = f.person()
    d.lines(f"Mrs. {d.plant('name', ph.full)}", *d.plant_address(f.address()))
    d.lines(
        f"Dear Mrs. {ph.last},",
        f"Welcome to Bajaj Allianz Life. {ph.first}, your policy Bajaj Allianz Life Goal Assure",
        "has been issued. Your premium of Rs. 24,000 is payable half-yearly for 15 years.",
        f"Your advisor {d.plant('name', agent.full)} will assist you with any servicing request.",
        "Regards,",
        "Customer Service Team",
    )
    d.keep += ["Bajaj Allianz Life", "Goal Assure", "24,000", "half-yearly", "15 years"]
    return d


def split_lines(f: Faker) -> Doc:
    d = Doc("08_split_lines")
    ph = f.person()
    child = f.person(ph.last)
    addr = f.address()
    d.lines(
        "Tata AIA Life - Smart Sampoorna Raksha",
        f"Proposer Name: {d.plant('name', ph.first)}",
        f"{d.plant('name', ph.last)}",
        f"Policy Number: {d.plant('policy_no', f.digits(8))}",
        f"Correspondence Address: {d.plant_address(addr)[0]}",
        addr[1],
        addr[2],
        f"Child: {d.plant('name', child.full)}    Premium: Rs. 36,000 Monthly mode Rs. 3,000",
        "Policy Term: 25 years    Premium Paying Term: 15 years",
    )
    d.keep += ["Smart Sampoorna Raksha", "36,000", "25 years", "15 years"]
    return d


def ocr_noisy(f: Faker) -> Doc:
    d = Doc("09_ocr_noisy")
    ph = f.person()
    mobile = f.mobile()
    d.lines(
        "Kotak Life - Kotak Assured Pension",
        f"Po1icy No ; {d.plant('policy_no', f.digits(8))}",
        f"Name  of  the  Life  Assured :  {d.plant('name', ph.full)}",
        f"D.O.B : {d.plant('dob', '7 Mar 1983')}",
        f"Mob1le No : {d.plant('phone', mobile)}",
        f"PAN No. : {d.plant('pan', f.pan(ph.last))}",
        "Date of Commencement : 21/09/2016    Vesting Date : 21/09/2041",
        "Guaranteed Vesting Benefit : Rs. 18,50,000",
    )
    d.keep += ["Kotak Assured Pension", "21/09/2016", "21/09/2041", "18,50,000"]
    return d


def allcaps_misc(f: Faker) -> Doc:
    d = Doc("10_allcaps_misc")
    la = f.person()
    father = f.person(la.last)
    appointee = f.person()
    d.lines(
        "ADITYA BIRLA SUN LIFE INSURANCE - ABSLI VISION STAR PLAN",
        f"NAME OF LIFE ASSURED : {d.plant('name', la.full.upper())}",
        f"S/o {d.plant('name', father.full)}",
        f"DATE OF BIRTH : {d.plant('dob', 'July 12, 1984')}",
        f"CKYC No: {d.plant('customer_id', f.digits(14))}    Client ID: {d.plant('customer_id', 'C' + f.digits(7))}",
        f"NOMINEE 1 : {d.plant('name', f.person().full.upper())}    NOMINEE 2 : {d.plant('name', f.person().full.upper())}",
        f"APPOINTEE : {d.plant('name', appointee.full)}",
        f"Customer ID {d.plant('customer_id', f.digits(9))}",
        "SURVIVAL BENEFIT : 12% OF SUM ASSURED EVERY 5TH YEAR FROM YEAR 5 TO YEAR 20",
        "SUM ASSURED : RS. 15,00,000    PREMIUM : RS. 72,000 ANNUAL FOR 12 YEARS",
    )
    d.keep += ["VISION STAR", "12% OF SUM ASSURED", "15,00,000", "72,000"]
    return d


BUILDERS = [schedule_kv, child_plan_nominee_table, ulip_illustration, pension_annuity,
            premium_receipt, mf_statement, welcome_letter, split_lines, ocr_noisy, allcaps_misc]


def build_all(seed: int = 7) -> list[Doc]:
    f = Faker(seed)
    return [b(f) for b in BUILDERS]

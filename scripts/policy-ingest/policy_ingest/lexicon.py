"""Word lists shared by the detectors and the audit shape report."""

# Brand and plan words that NER often mistakes for people. A PERSON hit made only of
# these words is dropped, and these words are never propagated as name tokens.
KEEP_TERMS = {
    w.lower()
    for w in """
    lic hdfc icici sbi bajaj allianz tata aia max kotak aditya birla sun reliance nippon pnb
    metlife canara hsbc edelweiss tokio bharti axa future generali indiafirst aviva shriram
    star union pramerica exide ageas aegon sahara mirae axis uti dsp franklin templeton
    motilal oswal parag parikh quant invesco mahindra manulife baroda bnp paribas navi
    pgim sundaram quantum taurus prudential life insurance mutual fund amc jeevan saral
    umang anand lakshya tarun labh shanti akshay amrit bima ratna dhan vriddhi sukanya
    samriddhi smart kid child pension retirement guaranteed wealth plus pro elite
    """.split()
}

# Common words that must never be redacted as a name token on their own.
COMMON_WORDS = {
    w.lower()
    for w in """
    the and for with from this that your you our policy plan name date birth life assured
    nominee proposer holder premium sum benefit benefits maturity death annual monthly
    yearly quarterly mode term years year age amount total fund value bank branch account
    address city state india mr mrs ms miss master shri smt kumari dear sir madam
    customer client agent advisor code number details page schedule certificate
    """.split()
}

# Words allowed to appear verbatim in the audit shape report. Anything else is reduced
# to character classes, so the report shows layout without content.
LABEL_LEXICON = COMMON_WORDS | KEEP_TERMS | {
    w.lower()
    for w in """
    of to in on at by as is are be no id pan aadhaar uid email e-mail mobile phone tel
    contact pin pincode commencement issue start end vesting due next frequency paying
    payment payout survival annuity rider riders sum assured insured relationship
    father mother husband wife spouse son daughter guardian appointee minor gender male
    female dob proposal application folio ckyc uan ifsc micr branch nominee's proposer's
    holder's assured's agent's advisor's intermediary broker arn euin type status units
    nav scheme option growth idcw lock-in lock in illustration rate assumed gross net
    gst tax receipt received rs inr total due paid amount mode single regular limited
    """.split()
}

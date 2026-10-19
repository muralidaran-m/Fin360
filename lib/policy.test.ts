import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  addMonths,
  buildPolicyInsight,
  countdown,
  formatCountdown,
  planToRecords,
  policyToRow,
  premiumSchedule,
  toISODate,
} from "@/lib/policy"
import type { Policy, PolicyPayout } from "@/lib/types"
import { policyPlanSchema } from "@/lib/validation"

const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number)
  return new Date(y, m - 1, day)
}

const basePolicy: Policy = {
  PolicyID: "p1",
  Nickname: "test",
  Insurer: "Acme Life",
  PlanName: "Acme Pension",
  Type: "retirement",
  PolicyNoLast4: "",
  StartDate: "2020-03-15",
  PremiumAmount: 50000,
  PremiumFrequency: "annual",
  PremiumPayingTermYrs: 10,
  PolicyTermYrs: null,
  MaturityDate: "",
  VestingDate: "2040-03-15",
  SumAssured: 1000000,
  LockInYrs: null,
  Riders: [],
  Benefits: [],
  Summary: "",
  IllustrativeOnly: false,
  UpdatedAt: "",
}

describe("addMonths", () => {
  it("clamps to month end", () => {
    assert.equal(toISODate(addMonths(d("2024-01-31"), 1)), "2024-02-29")
    assert.equal(toISODate(addMonths(d("2023-01-31"), 1)), "2023-02-28")
  })
})

describe("premiumSchedule", () => {
  it("counts annual installments paid on schedule", () => {
    const s = premiumSchedule(basePolicy, d("2026-10-19"))
    assert.equal(s.totalInstallments, 10)
    assert.equal(s.installmentsPaid, 7) // 2020..2026
    assert.equal(s.installmentsRemaining, 3)
    assert.equal(s.paidAmount, 350000)
    assert.equal(s.remainingAmount, 150000)
    assert.equal(s.nextDueDate, "2027-03-15")
    assert.equal(s.payingEndDate, "2030-03-15")
  })

  it("treats an installment due today as paid", () => {
    const s = premiumSchedule(basePolicy, d("2027-03-15"))
    assert.equal(s.installmentsPaid, 8)
    assert.equal(s.nextDueDate, "2028-03-15")
  })

  it("has no next due date once the term is fully paid", () => {
    const s = premiumSchedule(basePolicy, d("2035-01-01"))
    assert.equal(s.installmentsPaid, 10)
    assert.equal(s.nextDueDate, null)
  })

  it("handles monthly and not-yet-started policies", () => {
    const monthly = { ...basePolicy, PremiumFrequency: "monthly" as const, PremiumAmount: 1000 }
    assert.equal(premiumSchedule(monthly, d("2020-05-14")).installmentsPaid, 2)
    assert.equal(premiumSchedule(monthly, d("2020-05-15")).installmentsPaid, 3)
    const s = premiumSchedule(basePolicy, d("2019-01-01"))
    assert.equal(s.installmentsPaid, 0)
    assert.equal(s.nextDueDate, "2020-03-15")
  })

  it("handles single premium and open-ended SIPs", () => {
    const single = premiumSchedule({ ...basePolicy, PremiumFrequency: "single" }, d("2026-01-01"))
    assert.deepEqual([single.installmentsPaid, single.totalInstallments, single.nextDueDate], [1, 1, null])
    const sip = premiumSchedule(
      { ...basePolicy, PremiumFrequency: "monthly", PremiumPayingTermYrs: null },
      d("2020-06-20")
    )
    assert.equal(sip.totalInstallments, null)
    assert.equal(sip.installmentsPaid, 4)
    assert.equal(sip.nextDueDate, "2020-07-15")
  })
})

describe("countdown", () => {
  it("splits into years/months/days", () => {
    const c = countdown(d("2026-10-19"), "2040-03-15")
    assert.deepEqual([c.years, c.months, c.days, c.past], [13, 4, 25, false])
    assert.equal(formatCountdown(c), "13 yrs 4 mo")
    assert.equal(countdown(d("2026-10-19"), "2026-01-01").past, true)
  })
})

describe("buildPolicyInsight", () => {
  const payouts: PolicyPayout[] = [
    { PayoutID: "a", PolicyID: "p1", Date: "2040-03-15", Age: 60, Amount: null, Percent: 60, Kind: "maturity", Guaranteed: true, Note: "" },
    { PayoutID: "b", PolicyID: "p1", Date: "2041-03-15", Age: 61, Amount: 80000, Percent: null, Kind: "annuity", Guaranteed: false, Note: "" },
    { PayoutID: "c", PolicyID: "p1", Date: "", Age: null, Amount: null, Percent: null, Kind: "annuity", Guaranteed: false, Note: "" },
  ]

  it("derives phases and current phase", () => {
    const i = buildPolicyInsight(basePolicy, payouts, d("2026-10-19"))
    assert.equal(i.currentPhase, "premium")
    assert.deepEqual(
      i.phases.phases.map((p) => [p.key, p.start, p.end]),
      [
        ["premium", "2020-03-15", "2030-03-15"],
        ["accumulation", "2030-03-15", "2040-03-15"],
        ["payout", "2040-03-15", "2041-03-15"],
      ]
    )
    assert.equal(buildPolicyInsight(basePolicy, payouts, d("2032-01-01")).currentPhase, "accumulation")
    assert.equal(buildPolicyInsight(basePolicy, payouts, d("2040-06-01")).currentPhase, "payout")
  })

  it("splits guaranteed vs illustrative and resolves percent of sum assured", () => {
    const i = buildPolicyInsight(basePolicy, payouts, d("2026-10-19"))
    assert.equal(i.guaranteedTotal, 600000)
    assert.equal(i.illustrativeTotal, 80000)
    assert.equal(i.unquantifiedPayouts.length, 1)
    assert.deepEqual(i.payoutBars.map((b) => b.label), ["2040", "2041"])
  })

  it("leaves a lifetime annuity payout phase open-ended", () => {
    const i = buildPolicyInsight(basePolicy, [], d("2045-01-01"))
    assert.equal(i.phases.payoutOpenEnded, true)
    assert.equal(i.currentPhase, "payout")
  })
})

describe("plan contract", () => {
  const plan = {
    policy: {
      nickname: "x", insurer: "Acme", planName: "Plan", type: "child", policyNoLast4: "1234",
      startDate: "2022-01-01", premiumAmount: 1000, premiumFrequency: "annual",
      premiumPayingTermYrs: 5, policyTermYrs: 15, maturityDate: null, vestingDate: null,
      sumAssured: null, lockInYrs: null, riders: ["Waiver"], benefits: [], summary: "",
      illustrativeOnly: true,
    },
    payouts: [],
  }

  it("accepts the contract and rejects unknown keys", () => {
    assert.equal(policyPlanSchema.safeParse(plan).success, true)
    const extra = { ...plan, policy: { ...plan.policy, holderName: "nope" } }
    assert.equal(policyPlanSchema.safeParse(extra).success, false)
  })

  it("maps to sheet rows with JSON arrays and blank nulls", () => {
    const parsed = policyPlanSchema.parse(plan)
    const { policy } = planToRecords(parsed, "id1", () => "x", new Date(0))
    const row = policyToRow(policy)
    assert.equal(row.Riders, '["Waiver"]')
    assert.equal(row.SumAssured, "")
    assert.equal(row.MaturityDate, "")
  })
})

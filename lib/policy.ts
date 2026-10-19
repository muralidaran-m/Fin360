import type { Policy, PolicyPayout, PremiumFrequency } from "@/lib/types"
import type { PolicyPlan } from "@/lib/validation"

// Pure, framework-free policy math so it can run in the app, in scripts and in
// tests alike. All dates are local-time "YYYY-MM-DD" strings at the edges.

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

export function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Adds calendar months, clamping the day to the target month's length (Jan 31 + 1 → Feb 28/29). */
export function addMonths(d: Date, months: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay))
}

/** Whole calendar months from `from` to `to` (0 when `to` is before `from`). */
export function wholeMonthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (addMonths(from, months) > to) months -= 1
  return Math.max(0, months)
}

const DAY_MS = 24 * 60 * 60 * 1000

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)
}

export const MONTHS_PER_INSTALLMENT: Record<PremiumFrequency, number> = {
  annual: 12,
  "half-yearly": 6,
  quarterly: 3,
  monthly: 1,
  single: 0,
}

export type PremiumSchedule = {
  /** null when the paying term is open-ended (e.g. an SIP with no fixed term). */
  totalInstallments: number | null
  installmentsPaid: number
  installmentsRemaining: number | null
  paidAmount: number | null
  remainingAmount: number | null
  totalAmount: number | null
  nextDueDate: string | null
  /** End of the premium-paying window (start + paying term); null when open-ended. */
  payingEndDate: string | null
}

/**
 * Premium progress assuming every installment was paid on its due date. An
 * installment due today counts as paid.
 */
export function premiumSchedule(
  policy: Pick<
    Policy,
    "StartDate" | "PremiumAmount" | "PremiumFrequency" | "PremiumPayingTermYrs"
  >,
  today: Date
): PremiumSchedule {
  const start = parseIsoDate(policy.StartDate)
  const now = startOfDay(today)
  const started = now >= start
  const premium = policy.PremiumAmount
  const times = (n: number | null) => (premium === null || n === null ? null : premium * n)

  if (policy.PremiumFrequency === "single") {
    const paid = started ? 1 : 0
    return {
      totalInstallments: 1,
      installmentsPaid: paid,
      installmentsRemaining: 1 - paid,
      paidAmount: times(paid),
      remainingAmount: times(1 - paid),
      totalAmount: times(1),
      nextDueDate: started ? null : policy.StartDate,
      payingEndDate: policy.StartDate,
    }
  }

  const step = MONTHS_PER_INSTALLMENT[policy.PremiumFrequency]
  const elapsed = started ? Math.floor(wholeMonthsBetween(start, now) / step) + 1 : 0
  const term = policy.PremiumPayingTermYrs
  const total = term === null ? null : Math.round((term * 12) / step)
  const paid = total === null ? elapsed : Math.min(total, elapsed)
  const remaining = total === null ? null : total - paid
  const nextDue =
    total !== null && paid >= total ? null : toISODate(addMonths(start, paid * step))

  return {
    totalInstallments: total,
    installmentsPaid: paid,
    installmentsRemaining: remaining,
    paidAmount: times(paid),
    remainingAmount: times(remaining),
    totalAmount: times(total),
    nextDueDate: nextDue,
    payingEndDate: term === null ? null : toISODate(addMonths(start, term * 12)),
  }
}

export type Milestone = {
  label: "Vesting" | "Maturity" | "Lock-in ends"
  date: string
}

/** The headline date a policy is counting down to: vesting, else maturity, else lock-in end. */
export function policyMilestone(
  policy: Pick<Policy, "StartDate" | "VestingDate" | "MaturityDate" | "PolicyTermYrs" | "LockInYrs">
): Milestone | null {
  if (policy.VestingDate) return { label: "Vesting", date: policy.VestingDate }
  if (policy.MaturityDate) return { label: "Maturity", date: policy.MaturityDate }
  const start = parseIsoDate(policy.StartDate)
  if (policy.PolicyTermYrs) {
    return { label: "Maturity", date: toISODate(addMonths(start, policy.PolicyTermYrs * 12)) }
  }
  if (policy.LockInYrs) {
    return { label: "Lock-in ends", date: toISODate(addMonths(start, policy.LockInYrs * 12)) }
  }
  return null
}

export type Countdown = {
  years: number
  months: number
  days: number
  totalDays: number
  /** True once the target date has passed. */
  past: boolean
}

export function countdown(today: Date, target: string): Countdown {
  const now = startOfDay(today)
  const to = parseIsoDate(target)
  const totalDays = daysBetween(now, to)
  if (totalDays <= 0) return { years: 0, months: 0, days: 0, totalDays, past: totalDays < 0 }
  const months = wholeMonthsBetween(now, to)
  const days = daysBetween(addMonths(now, months), to)
  return { years: Math.floor(months / 12), months: months % 12, days, totalDays, past: false }
}

export function formatCountdown(c: Countdown): string {
  if (c.past) return "Passed"
  if (c.totalDays === 0) return "Today"
  const parts: string[] = []
  if (c.years) parts.push(`${c.years} yr${c.years === 1 ? "" : "s"}`)
  if (c.months) parts.push(`${c.months} mo`)
  if (!c.years && c.days) parts.push(`${c.days} day${c.days === 1 ? "" : "s"}`)
  return parts.join(" ")
}

/** A payout's rupee amount, deriving it from a percent of sum assured when only that is known. */
export function resolvePayoutAmount(
  payout: Pick<PolicyPayout, "Amount" | "Percent">,
  sumAssured: number | null
): number | null {
  if (payout.Amount !== null) return payout.Amount
  if (payout.Percent !== null && sumAssured !== null) return (payout.Percent / 100) * sumAssured
  return null
}

export type PhaseKey = "premium" | "accumulation" | "payout"
export type CurrentPhase = "not-started" | PhaseKey | "completed"

export type PolicyPhase = {
  key: PhaseKey
  start: string
  end: string
}

export const PHASE_LABELS: Record<CurrentPhase, string> = {
  "not-started": "Not started",
  premium: "Premium-paying",
  accumulation: "Accumulation",
  payout: "Payout",
  completed: "Completed",
}

/** Years shown for a payout phase with no known end (e.g. a lifetime annuity). */
const OPEN_ENDED_PAYOUT_YEARS = 10

export type PolicyPhases = {
  phases: PolicyPhase[]
  /** True when the payout phase has no known end (lifetime annuity). */
  payoutOpenEnded: boolean
}

function maxDate(dates: (string | null)[]): string | null {
  return dates.filter((d): d is string => Boolean(d)).sort().at(-1) ?? null
}

/**
 * Splits a policy's life into sequential premium-paying, accumulation and payout
 * phases. A payout that falls inside the paying term (money-back) does not cut
 * the paying phase short; the payout phase starts at whichever comes later.
 */
export function policyPhases(policy: Policy, payouts: PolicyPayout[]): PolicyPhases {
  const start = policy.StartDate
  const milestone = policyMilestone(policy)
  const schedule = premiumSchedule(policy, parseIsoDate(start))
  const payingEnd = schedule.payingEndDate ?? milestone?.date ?? start

  const datedPayouts = payouts.map((p) => p.Date).filter(Boolean).sort()
  const firstPayout = datedPayouts[0] ?? milestone?.date ?? payingEnd
  const payoutStart = maxDate([firstPayout, payingEnd])!

  const termEnd = policy.PolicyTermYrs
    ? toISODate(addMonths(parseIsoDate(start), policy.PolicyTermYrs * 12))
    : null
  let payoutEnd = maxDate([payoutStart, datedPayouts.at(-1) ?? null, policy.MaturityDate, termEnd])!

  const payoutOpenEnded =
    payoutEnd === payoutStart &&
    (policy.Type === "retirement" || payouts.some((p) => p.Kind === "annuity"))
  if (payoutOpenEnded) {
    payoutEnd = toISODate(addMonths(parseIsoDate(payoutStart), OPEN_ENDED_PAYOUT_YEARS * 12))
  }

  return {
    phases: [
      { key: "premium", start, end: payingEnd },
      { key: "accumulation", start: payingEnd, end: payoutStart },
      { key: "payout", start: payoutStart, end: payoutEnd },
    ],
    payoutOpenEnded,
  }
}

export function currentPhase(
  { phases, payoutOpenEnded }: PolicyPhases,
  today: Date
): CurrentPhase {
  const now = toISODate(today)
  const [premium, accumulation, payout] = phases
  if (now < premium.start) return "not-started"
  if (now < premium.end) return "premium"
  if (now < accumulation.end) return "accumulation"
  if (payoutOpenEnded || now <= payout.end) return "payout"
  return "completed"
}

/** Converts a validated plan into sheet records; pass the existing PolicyID to keep re-applies idempotent. */
export function planToRecords(
  plan: PolicyPlan,
  policyId: string,
  newId: () => string,
  now: Date
): { policy: Policy; payouts: PolicyPayout[] } {
  const p = plan.policy
  return {
    policy: {
      PolicyID: policyId,
      Nickname: p.nickname,
      Insurer: p.insurer,
      PlanName: p.planName,
      Type: p.type,
      PolicyNoLast4: p.policyNoLast4 ?? "",
      StartDate: p.startDate,
      PremiumAmount: p.premiumAmount,
      PremiumFrequency: p.premiumFrequency,
      PremiumPayingTermYrs: p.premiumPayingTermYrs,
      PolicyTermYrs: p.policyTermYrs,
      MaturityDate: p.maturityDate ?? "",
      VestingDate: p.vestingDate ?? "",
      SumAssured: p.sumAssured,
      LockInYrs: p.lockInYrs,
      Riders: p.riders,
      Benefits: p.benefits,
      Summary: p.summary,
      IllustrativeOnly: p.illustrativeOnly,
      UpdatedAt: now.toISOString(),
    },
    payouts: plan.payouts.map((payout) => ({
      PayoutID: newId(),
      PolicyID: policyId,
      Date: payout.date ?? "",
      Age: payout.age,
      Amount: payout.amount,
      Percent: payout.percent,
      Kind: payout.kind,
      Guaranteed: payout.guaranteed,
      Note: payout.note,
    })),
  }
}

type CellValue = string | number | boolean

function cell(value: string | number | boolean | null): CellValue {
  return value === null ? "" : value
}

/** Flattens records into sheet cells: nulls become blanks, arrays become JSON strings. */
export function policyToRow(policy: Policy): Record<string, CellValue> {
  return Object.fromEntries(
    Object.entries(policy).map(([k, v]) => [k, Array.isArray(v) ? JSON.stringify(v) : cell(v)])
  )
}

export function payoutToRow(payout: PolicyPayout): Record<string, CellValue> {
  return Object.fromEntries(Object.entries(payout).map(([k, v]) => [k, cell(v)]))
}

export type PayoutBar = {
  label: string
  guaranteed: number
  illustrative: number
  kind: PolicyPayout["Kind"]
  note: string
}

/** Payouts with a known amount, in schedule order, split into guaranteed vs illustrative. */
export function payoutBars(policy: Policy, payouts: PolicyPayout[]): PayoutBar[] {
  return payouts
    .map((p) => ({ p, amount: resolvePayoutAmount(p, policy.SumAssured) }))
    .filter((x): x is { p: PolicyPayout; amount: number } => x.amount !== null)
    .sort((a, b) => {
      if (a.p.Date && b.p.Date) return a.p.Date.localeCompare(b.p.Date)
      return (a.p.Age ?? 0) - (b.p.Age ?? 0)
    })
    .map(({ p, amount }) => ({
      label: p.Date ? p.Date.slice(0, 4) : p.Age !== null ? `Age ${p.Age}` : "—",
      guaranteed: p.Guaranteed ? amount : 0,
      illustrative: p.Guaranteed ? 0 : amount,
      kind: p.Kind,
      note: p.Note,
    }))
}

export type PolicyInsight = {
  policy: Policy
  schedule: PremiumSchedule
  milestone: (Milestone & { countdown: Countdown }) | null
  phases: PolicyPhases
  currentPhase: CurrentPhase
  payoutBars: PayoutBar[]
  /** Payouts in the plan that have no derivable amount (shown as text only). */
  unquantifiedPayouts: PolicyPayout[]
  guaranteedTotal: number
  illustrativeTotal: number
}

export function buildPolicyInsight(
  policy: Policy,
  payouts: PolicyPayout[],
  today: Date
): PolicyInsight {
  const milestone = policyMilestone(policy)
  const phases = policyPhases(policy, payouts)
  const bars = payoutBars(policy, payouts)
  return {
    policy,
    schedule: premiumSchedule(policy, today),
    milestone: milestone ? { ...milestone, countdown: countdown(today, milestone.date) } : null,
    phases,
    currentPhase: currentPhase(phases, today),
    payoutBars: bars,
    unquantifiedPayouts: payouts.filter(
      (p) => resolvePayoutAmount(p, policy.SumAssured) === null
    ),
    guaranteedTotal: bars.reduce((s, b) => s + b.guaranteed, 0),
    illustrativeTotal: bars.reduce((s, b) => s + b.illustrative, 0),
  }
}

import type { PaymentMode, Transaction } from "@/lib/types"

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

export type BillingCycle = Pick<PaymentMode, "StatementDay" | "DueDays">

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/**
 * Computes the date a card purchase should count toward, given the card's
 * billing cycle. The due date is a fixed number of days after the statement
 * date (e.g. "20 days after statement"), NOT a fixed day-of-month — a
 * statement on Sep 17 due 20 days later lands on Oct 7, but the following
 * month's Oct 17 statement lands on Nov 6. StatementDay is clamped to the
 * statement month's length (e.g. a StatementDay of 31 lands on Feb 28/29);
 * DueDays is then added as plain day arithmetic, which naturally rolls over
 * month/year boundaries.
 */
export function computeBillDate(purchaseDate: string, cycle: BillingCycle): string {
  const p = parseIsoDate(purchaseDate)

  let statementMonth = new Date(p.getFullYear(), p.getMonth(), 1)
  if (p.getDate() > cycle.StatementDay) {
    statementMonth = new Date(p.getFullYear(), p.getMonth() + 1, 1)
  }

  const statementDay = Math.min(
    cycle.StatementDay,
    lastDayOfMonth(statementMonth.getFullYear(), statementMonth.getMonth())
  )
  const statementDate = new Date(statementMonth.getFullYear(), statementMonth.getMonth(), statementDay)

  const billDate = new Date(
    statementDate.getFullYear(),
    statementDate.getMonth(),
    statementDate.getDate() + cycle.DueDays
  )
  return toISODate(billDate)
}

/** The date a transaction should count toward for aggregation/display purposes. */
export function getEffectiveDate(tx: Pick<Transaction, "Date" | "BillDate">): string {
  return tx.BillDate || tx.Date
}

/**
 * The purchase-date window of the statement a bill date belongs to: the day
 * after the previous statement through the statement date itself. Returns null
 * when the bill date doesn't fit the card's cycle — it was edited by hand, or
 * the card's StatementDay/DueDays changed after the transaction was saved — as
 * the window can't be recovered from the current settings in those cases.
 */
export function statementPeriod(
  billDate: string,
  cycle: BillingCycle
): { start: string; end: string } | null {
  if (cycle.StatementDay <= 0 || cycle.DueDays <= 0) return null

  const due = parseIsoDate(billDate)
  const statement = new Date(due.getFullYear(), due.getMonth(), due.getDate() - cycle.DueDays)
  const end = toISODate(statement)
  if (computeBillDate(end, cycle) !== billDate) return null

  const prevYear = statement.getFullYear()
  const prevMonth = statement.getMonth() - 1
  const prevStatementDay = Math.min(
    cycle.StatementDay,
    new Date(prevYear, prevMonth + 1, 0).getDate()
  )
  return { start: toISODate(new Date(prevYear, prevMonth, prevStatementDay + 1)), end }
}

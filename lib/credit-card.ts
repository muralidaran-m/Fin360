import type { PaymentMode, Transaction } from "@/lib/types"

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

export function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function toISODate(d: Date): string {
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

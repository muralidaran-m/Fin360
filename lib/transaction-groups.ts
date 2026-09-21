import { getEffectiveDate } from "@/lib/credit-card"
import type { Transaction } from "@/lib/types"

export type DateGroup = {
  date: string
  label: string
  transactions: Transaction[]
}

export type MonthGroup = {
  month: string
  label: string
  dateGroups: DateGroup[]
  total: number
}

/** Net amount (expenses minus income) for a set of transactions. */
function netAmount(transactions: Transaction[]): number {
  return transactions.reduce(
    (sum, t) => sum + (t.Type === "Income" ? -t.Amount : t.Amount),
    0
  )
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
})

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
})

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Sorts transactions most-recent-first: by Date descending, then by original
 * order descending as a tiebreaker. Transactions carry no timestamp, so for
 * same-day entries we treat later positions in the source array (i.e. more
 * recently added rows) as more recent.
 */
export function sortTransactionsByRecency(transactions: Transaction[]): Transaction[] {
  return transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((a, b) => b.transaction.Date.localeCompare(a.transaction.Date) || b.index - a.index)
    .map(({ transaction }) => transaction)
}

/**
 * Groups transactions by month, then by day, newest first within each level.
 * By default the grouping date is the purchase Date; pass `byBillingCycle`
 * to group credit-card transactions by their billing-cycle date (BillDate)
 * instead, so a card's spend lines up with its statement periods.
 */
export function groupTransactionsByMonthAndDate(
  transactions: Transaction[],
  { byBillingCycle = false }: { byBillingCycle?: boolean } = {}
): MonthGroup[] {
  const groupDate = (tx: Transaction) => (byBillingCycle ? getEffectiveDate(tx) : tx.Date)

  const sorted = transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort(
      (a, b) =>
        groupDate(b.transaction).localeCompare(groupDate(a.transaction)) || b.index - a.index
    )
    .map(({ transaction }) => transaction)

  const monthOrder: string[] = []
  const monthMap = new Map<string, Map<string, Transaction[]>>()

  for (const tx of sorted) {
    const date = groupDate(tx)
    const month = date.slice(0, 7)
    if (!monthMap.has(month)) {
      monthMap.set(month, new Map())
      monthOrder.push(month)
    }
    const dateMap = monthMap.get(month)!
    if (!dateMap.has(date)) dateMap.set(date, [])
    dateMap.get(date)!.push(tx)
  }

  return monthOrder.map((month) => {
    const dateMap = monthMap.get(month)!
    const dateGroups: DateGroup[] = [...dateMap.entries()].map(([date, txs]) => ({
      date,
      label: WEEKDAY_FORMATTER.format(parseIsoDate(date)),
      transactions: txs,
    }))

    return {
      month,
      label: MONTH_FORMATTER.format(parseIsoDate(`${month}-01`)),
      dateGroups,
      total: netAmount(dateGroups.flatMap((g) => g.transactions)),
    }
  })
}

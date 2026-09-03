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

/** Groups transactions by month, then by day, newest first within each level. */
export function groupTransactionsByMonthAndDate(
  transactions: Transaction[]
): MonthGroup[] {
  const sorted = [...transactions].sort((a, b) => b.Date.localeCompare(a.Date))

  const monthOrder: string[] = []
  const monthMap = new Map<string, Map<string, Transaction[]>>()

  for (const tx of sorted) {
    const month = tx.Date.slice(0, 7)
    if (!monthMap.has(month)) {
      monthMap.set(month, new Map())
      monthOrder.push(month)
    }
    const dateMap = monthMap.get(month)!
    if (!dateMap.has(tx.Date)) dateMap.set(tx.Date, [])
    dateMap.get(tx.Date)!.push(tx)
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
    }
  })
}

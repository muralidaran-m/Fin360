import type { AddedBy, Category, CategoryType, Transaction } from "@/lib/types"

export type Timeframe = "current" | "last" | "ytd"

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  current: "Current Month",
  last: "Last Month",
  ytd: "Year to Date",
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

export type DateRange = { start: string; end: string }

export function getTimeframeRange(timeframe: Timeframe, now = new Date()): DateRange {
  if (timeframe === "last") {
    const lastMonth = addMonths(now, -1)
    return { start: toISODate(startOfMonth(lastMonth)), end: toISODate(endOfMonth(lastMonth)) }
  }
  if (timeframe === "ytd") {
    return { start: toISODate(new Date(now.getFullYear(), 0, 1)), end: toISODate(now) }
  }
  return { start: toISODate(startOfMonth(now)), end: toISODate(endOfMonth(now)) }
}

export function filterByRange(transactions: Transaction[], range: DateRange): Transaction[] {
  return transactions.filter((t) => t.Date >= range.start && t.Date <= range.end)
}

/** Sum of IsRecurring expense transactions for the current month. */
export function totalRecurringExpense(transactions: Transaction[], now = new Date()): number {
  const range = getTimeframeRange("current", now)
  return filterByRange(transactions, range)
    .filter((t) => t.IsRecurring && t.Type === "Expense")
    .reduce((sum, t) => sum + t.Amount, 0)
}

export type BudgetBreakdown = Record<Extract<CategoryType, "Need" | "Want" | "Savings">, number>

/** Expense totals grouped by category Type (Need/Want/Savings), for the given range. */
export function budgetBreakdown(
  transactions: Transaction[],
  categoriesById: Map<string, Category>,
  range: DateRange
): BudgetBreakdown {
  const totals: BudgetBreakdown = { Need: 0, Want: 0, Savings: 0 }
  for (const t of filterByRange(transactions, range)) {
    const type = categoriesById.get(t.CategoryID)?.Type
    if (type === "Need" || type === "Want" || type === "Savings") {
      totals[type] += t.Amount
    }
  }
  return totals
}

export type BurnRatePoint = { day: number; actual: number; baseline: number }

/**
 * Daily cumulative spend for the current month vs. a baseline projected
 * from the average of the preceding 3 completed months, spread evenly
 * across the days of the current month.
 */
export function burnRate(transactions: Transaction[], now = new Date()): BurnRatePoint[] {
  const range = getTimeframeRange("current", now)
  const daysInMonth = endOfMonth(now).getDate()
  const daysElapsed = now.getDate()

  const dailyTotals = new Array(daysInMonth).fill(0)
  for (const t of filterByRange(transactions, range)) {
    if (t.Type !== "Expense") continue
    const day = Number(t.Date.slice(8, 10))
    dailyTotals[day - 1] += t.Amount
  }

  let priorMonthsTotal = 0
  let priorMonthsCount = 0
  for (let i = 1; i <= 3; i++) {
    const priorRange = getTimeframeRange("current", addMonths(now, -i))
    const total = filterByRange(transactions, priorRange)
      .filter((t) => t.Type === "Expense")
      .reduce((sum, t) => sum + t.Amount, 0)
    priorMonthsTotal += total
    priorMonthsCount += 1
  }
  const baselinePerDay =
    priorMonthsCount > 0 ? priorMonthsTotal / priorMonthsCount / daysInMonth : 0

  const points: BurnRatePoint[] = []
  let runningActual = 0
  for (let day = 1; day <= daysInMonth; day++) {
    runningActual += dailyTotals[day - 1]
    points.push({
      day,
      actual: day <= daysElapsed ? runningActual : Number.NaN,
      baseline: baselinePerDay * day,
    })
  }
  return points
}

export type CategoryDrift = {
  categoryId: string
  categoryName: string
  current: number
  trailingAverage: number
  percentChange: number
}

const DRIFT_THRESHOLD = 0.15

/** Categories whose current-month spend differs from their 3-month trailing average by >=15%. */
export function categoryDrift(
  transactions: Transaction[],
  categories: Category[],
  now = new Date()
): CategoryDrift[] {
  const currentRange = getTimeframeRange("current", now)
  const currentByCategory = sumByCategory(filterByRange(transactions, currentRange))

  const trailingTotals = new Map<string, number>()
  for (let i = 1; i <= 3; i++) {
    const range = getTimeframeRange("current", addMonths(now, -i))
    const byCategory = sumByCategory(filterByRange(transactions, range))
    for (const [categoryId, amount] of byCategory) {
      trailingTotals.set(categoryId, (trailingTotals.get(categoryId) ?? 0) + amount)
    }
  }

  const categoriesById = new Map(categories.map((c) => [c.CategoryID, c]))
  const results: CategoryDrift[] = []

  const allCategoryIds = new Set([...currentByCategory.keys(), ...trailingTotals.keys()])
  for (const categoryId of allCategoryIds) {
    const trailingAverage = (trailingTotals.get(categoryId) ?? 0) / 3
    if (trailingAverage <= 0) continue

    const current = currentByCategory.get(categoryId) ?? 0
    const percentChange = (current - trailingAverage) / trailingAverage
    if (Math.abs(percentChange) < DRIFT_THRESHOLD) continue

    results.push({
      categoryId,
      categoryName: categoriesById.get(categoryId)?.Name ?? "Unknown",
      current,
      trailingAverage,
      percentChange,
    })
  }

  return results.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
}

function sumByCategory(transactions: Transaction[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (t.Type !== "Expense") continue
    totals.set(t.CategoryID, (totals.get(t.CategoryID) ?? 0) + t.Amount)
  }
  return totals
}

export type HouseholdSplit = Record<AddedBy, number>

/** Expense totals grouped by who added them, for the given range. */
export function householdSplit(transactions: Transaction[], range: DateRange): HouseholdSplit {
  const totals: HouseholdSplit = { User1: 0, User2: 0 }
  for (const t of filterByRange(transactions, range)) {
    if (t.Type !== "Expense") continue
    totals[t.AddedBy] += t.Amount
  }
  return totals
}

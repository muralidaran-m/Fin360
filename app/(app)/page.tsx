import { BreakdownDonut } from "@/components/dashboard/breakdown-donut"
import { BurnRateChart } from "@/components/dashboard/burn-rate-chart"
import { CategoryDriftChart } from "@/components/dashboard/category-drift-chart"
import { HouseholdSplitBar } from "@/components/dashboard/household-split-bar"
import { RecurringExpenseCard } from "@/components/dashboard/recurring-expense-card"
import { TimeframeTabs } from "@/components/dashboard/timeframe-tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  budgetBreakdown,
  burnRate,
  categoryDrift,
  filterByRange,
  getTimeframeRange,
  householdSplit,
  totalRecurringExpense,
  type Timeframe,
} from "@/lib/analytics"
import { getCategories, getTransactions } from "@/lib/data"
import { getCategoryIcon } from "@/lib/icons"

export const dynamic = "force-dynamic"

function parseTimeframe(value: string | string[] | undefined): Timeframe {
  return value === "last" || value === "ytd" ? value : "current"
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams
  const timeframe = parseTimeframe(params.range)

  const [categories, transactions] = await Promise.all([
    getCategories(),
    getTransactions(),
  ])

  const categoriesById = new Map(categories.map((c) => [c.CategoryID, c]))
  const now = new Date()
  const range = getTimeframeRange(timeframe, now)

  const recurring = totalRecurringExpense(transactions, now)
  const lastMonthRecurring = totalRecurringExpense(
    transactions,
    new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  )
  const breakdown = budgetBreakdown(transactions, categoriesById, range)
  const burn = burnRate(transactions, now)
  const drift = categoryDrift(transactions, categories, now)
  const split = householdSplit(transactions, range)

  const recent = [...filterByRange(transactions, range)]
    .sort((a, b) => b.Date.localeCompare(a.Date))
    .slice(0, 20)

  return (
    <div className="flex flex-col gap-6">
      <TimeframeTabs active={timeframe} />

      <RecurringExpenseCard amount={recurring} previousAmount={lastMonthRecurring} />

      <div className="grid gap-6 md:grid-cols-2">
        <BreakdownDonut breakdown={breakdown} />
        <HouseholdSplitBar split={split} />
      </div>

      <BurnRateChart points={burn} />

      <CategoryDriftChart drift={drift} />

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No transactions yet. Tap the + button to add one.
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((tx) => {
                const category = categoriesById.get(tx.CategoryID)
                const Icon = getCategoryIcon(category?.Icon ?? "")
                return (
                  <li
                    key={tx.TxID}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `${category?.ColorHex ?? "#999"}20`,
                        color: category?.ColorHex ?? "#999",
                      }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {tx.CategoryName}
                        </span>
                        {tx.IsRecurring ? (
                          <Badge variant="secondary" className="text-xs">
                            Recurring
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        {tx.Date} · {tx.AddedBy}
                        {tx.PaymentModeName ? ` · ${tx.PaymentModeName}` : ""}
                        {tx.Note ? ` · ${tx.Note}` : ""}
                      </p>
                    </div>
                    <span
                      className={
                        tx.Type === "Income"
                          ? "font-medium text-emerald-600"
                          : "font-medium"
                      }
                    >
                      {tx.Type === "Income" ? "+" : "-"}₹{tx.Amount.toFixed(2)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

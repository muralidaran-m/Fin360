import Link from "next/link"

import { BreakdownDonut } from "@/components/dashboard/breakdown-donut"
import { BurnRateChart } from "@/components/dashboard/burn-rate-chart"
import { CategoryDriftChart } from "@/components/dashboard/category-drift-chart"
import { HouseholdSplitBar } from "@/components/dashboard/household-split-bar"
import { RecurringExpenseCard } from "@/components/dashboard/recurring-expense-card"
import { TimeframeTabs } from "@/components/dashboard/timeframe-tabs"
import { TransactionList } from "@/components/transactions/transaction-list"
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
import { getAddedByNames, getCategories, getTransactions } from "@/lib/data"

const RECENT_TRANSACTIONS_PREVIEW_COUNT = 5

export const dynamic = "force-dynamic"

function parseTimeframe(value: string | string[] | undefined): Timeframe {
  return value === "last" || value === "ytd" ? value : "current"
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams
  const timeframe = parseTimeframe(params.range)

  const [categories, transactions, addedByNames] = await Promise.all([
    getCategories(),
    getTransactions(),
    getAddedByNames(),
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
    .slice(0, RECENT_TRANSACTIONS_PREVIEW_COUNT)

  return (
    <div className="flex flex-col gap-6">
      <TimeframeTabs active={timeframe} />

      <RecurringExpenseCard amount={recurring} previousAmount={lastMonthRecurring} />

      <div className="grid gap-6 md:grid-cols-2">
        <BreakdownDonut breakdown={breakdown} />
        <HouseholdSplitBar split={split} names={addedByNames} />
      </div>

      <BurnRateChart points={burn} />

      <CategoryDriftChart drift={drift} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent transactions</CardTitle>
          <Link
            href="/transactions"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={recent}
            categoriesById={categoriesById}
            addedByNames={addedByNames}
          />
        </CardContent>
      </Card>
    </div>
  )
}

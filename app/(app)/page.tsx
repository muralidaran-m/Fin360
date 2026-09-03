import Link from "next/link"

import { HouseholdSplitBar } from "@/components/dashboard/household-split-bar"
import { RecurringExpenseCard } from "@/components/dashboard/recurring-expense-card"
import { TransactionList } from "@/components/transactions/transaction-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  filterByRange,
  getTimeframeRange,
  householdSplit,
  totalRecurringExpense,
} from "@/lib/analytics"
import { getAddedByNames, getCategories, getTransactions } from "@/lib/data"

const RECENT_TRANSACTIONS_PREVIEW_COUNT = 5

export const dynamic = "force-dynamic"

export default async function Home() {
  const [categories, transactions, addedByNames] = await Promise.all([
    getCategories(),
    getTransactions(),
    getAddedByNames(),
  ])

  const categoriesById = new Map(categories.map((c) => [c.CategoryID, c]))
  const now = new Date()
  const range = getTimeframeRange("current", now)

  const recurring = totalRecurringExpense(transactions, now)
  const lastMonthRecurring = totalRecurringExpense(
    transactions,
    new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  )
  const split = householdSplit(transactions, range)

  const recent = [...filterByRange(transactions, range)]
    .sort((a, b) => b.Date.localeCompare(a.Date))
    .slice(0, RECENT_TRANSACTIONS_PREVIEW_COUNT)

  return (
    <div className="flex flex-col gap-6">
      <RecurringExpenseCard amount={recurring} previousAmount={lastMonthRecurring} />

      <HouseholdSplitBar split={split} names={addedByNames} />

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

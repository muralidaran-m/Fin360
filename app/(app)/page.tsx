import Link from "next/link"

import { HouseholdSplitBar } from "@/components/dashboard/household-split-bar"
import { RecurringExpenseCard } from "@/components/dashboard/recurring-expense-card"
import { SpendBarChart } from "@/components/dashboard/spend-bar-chart"
import { TotalSpendCard } from "@/components/dashboard/total-spend-card"
import { TransactionList } from "@/components/transactions/transaction-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  filterByRange,
  getTimeframeRange,
  householdSplit,
  totalRecurringExpense,
  totalSpend,
} from "@/lib/analytics"
import {
  getAddedByNames,
  getCategories,
  getEvents,
  getPaymentModes,
  getTransactions,
} from "@/lib/data"
import { sortTransactionsByRecency } from "@/lib/transaction-groups"

const RECENT_TRANSACTIONS_PREVIEW_COUNT = 5

export const dynamic = "force-dynamic"

export default async function Home() {
  const [categories, paymentModes, events, transactions, addedByNames] = await Promise.all([
    getCategories(),
    getPaymentModes(),
    getEvents(),
    getTransactions(),
    getAddedByNames(),
  ])

  const categoriesById = new Map(categories.map((c) => [c.CategoryID, c]))
  const now = new Date()
  const range = getTimeframeRange("current", now)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  const spend = totalSpend(transactions, now)
  const lastMonthSpend = totalSpend(transactions, lastMonth)

  const recurring = totalRecurringExpense(transactions, now)
  const lastMonthRecurring = totalRecurringExpense(transactions, lastMonth)
  const split = householdSplit(transactions, range)

  const recent = sortTransactionsByRecency(filterByRange(transactions, range)).slice(
    0,
    RECENT_TRANSACTIONS_PREVIEW_COUNT
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <TotalSpendCard amount={spend} previousAmount={lastMonthSpend} />
        <RecurringExpenseCard amount={recurring} previousAmount={lastMonthRecurring} />
        <HouseholdSplitBar split={split} names={addedByNames} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SpendBarChart
            transactions={transactions}
            categoriesById={categoriesById}
            range={range}
          />
        </div>

        <Card className="xl:col-span-1">
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
              categories={categories}
              paymentModes={paymentModes}
              events={events}
              addedByNames={addedByNames}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

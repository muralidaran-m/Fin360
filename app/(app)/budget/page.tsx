import { BreakdownDonut } from "@/components/dashboard/breakdown-donut"
import { BurnRateChart } from "@/components/dashboard/burn-rate-chart"
import { CategoryDriftChart } from "@/components/dashboard/category-drift-chart"
import { TimeframeTabs } from "@/components/dashboard/timeframe-tabs"
import {
  budgetBreakdown,
  burnRate,
  categoryDrift,
  getTimeframeRange,
  type Timeframe,
} from "@/lib/analytics"
import { getCategories, getTransactions } from "@/lib/data"

export const dynamic = "force-dynamic"

function parseTimeframe(value: string | string[] | undefined): Timeframe {
  return value === "last" || value === "ytd" ? value : "current"
}

export default async function BudgetPage({
  searchParams,
}: PageProps<"/budget">) {
  const params = await searchParams
  const timeframe = parseTimeframe(params.range)

  const [categories, transactions] = await Promise.all([
    getCategories(),
    getTransactions(),
  ])

  const categoriesById = new Map(categories.map((c) => [c.CategoryID, c]))
  const now = new Date()
  const range = getTimeframeRange(timeframe, now)

  const breakdown = budgetBreakdown(transactions, categoriesById, range)
  const burn = burnRate(transactions, now)
  const drift = categoryDrift(transactions, categories, now)

  return (
    <div className="flex flex-col gap-6">
      <TimeframeTabs active={timeframe} basePath="/budget" />

      <BreakdownDonut breakdown={breakdown} />

      <BurnRateChart points={burn} />

      <CategoryDriftChart drift={drift} />
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function RecurringExpenseCard({
  amount,
  previousAmount,
}: {
  amount: number
  previousAmount: number
}) {
  const delta = previousAmount > 0 ? (amount - previousAmount) / previousAmount : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-normal">
          Total Recurring Expense
          <span className="ml-1">· This month</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold">₹{amount.toFixed(2)}</span>
          {delta !== null ? (
            <span
              className={cn(
                "text-sm font-medium",
                delta > 0 ? "text-status-critical" : "text-status-good"
              )}
            >
              {delta > 0 ? "+" : ""}
              {(delta * 100).toFixed(0)}% vs last month
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

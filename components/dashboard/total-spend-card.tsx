import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function TotalSpendCard({
  amount,
  previousAmount,
}: {
  amount: number
  previousAmount: number
}) {
  const delta = previousAmount > 0 ? (amount - previousAmount) / previousAmount : null

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-normal">
          Total Spend
          <span className="ml-1">· This month</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold">₹{amount.toFixed(2)}</span>
          {delta !== null ? (
            <span
              className={cn(
                "text-xs font-medium",
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

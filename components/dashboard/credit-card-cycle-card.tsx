import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CreditCardCycleSummary } from "@/lib/analytics"
import { cn } from "@/lib/utils"

const DUE_SOON_THRESHOLD = 10

export function CreditCardCycleCard({ summary }: { summary: CreditCardCycleSummary }) {
  const dueSoon = summary.daysRemaining < DUE_SOON_THRESHOLD
  const dueLabel =
    summary.daysRemaining === 0
      ? "Due today"
      : summary.daysRemaining < 0
        ? `${Math.abs(summary.daysRemaining)} ${Math.abs(summary.daysRemaining) === 1 ? "day" : "days"} overdue`
        : `Due in ${summary.daysRemaining} ${summary.daysRemaining === 1 ? "day" : "days"}`

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-normal">
          {summary.paymentModeName}
          <span className="ml-1">· Current cycle</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold">₹{summary.amount.toFixed(2)}</span>
          <span
            className={cn(
              "text-xs",
              dueSoon
                ? "font-bold text-status-critical"
                : "font-medium text-muted-foreground"
            )}
          >
            {dueLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

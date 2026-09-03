import { AddPlanButton } from "@/app/(app)/planner/add-plan-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSandboxPlans } from "@/lib/data"

export const dynamic = "force-dynamic"

export default async function PlannerPage() {
  const plans = await getSandboxPlans()
  const sorted = [...plans].sort((a, b) => a.TargetDate.localeCompare(b.TargetDate))

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Savings plans</CardTitle>
          <AddPlanButton />
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No savings plans yet. Create one to start tracking a goal.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {sorted.map((plan) => {
                const progress =
                  plan.TargetAmount > 0
                    ? Math.min(100, (plan.CurrentSaved / plan.TargetAmount) * 100)
                    : 0
                const remaining = Math.max(0, plan.TargetAmount - plan.CurrentSaved)

                return (
                  <div key={plan.PlanID} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{plan.PlanName}</span>
                      <span className="text-muted-foreground text-xs">
                        Target {plan.TargetDate}
                      </span>
                    </div>
                    <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: "var(--section-planner)",
                        }}
                      />
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                      <span>
                        ₹{plan.CurrentSaved.toFixed(2)} of ₹
                        {plan.TargetAmount.toFixed(2)} ({progress.toFixed(0)}%)
                      </span>
                      <span>₹{remaining.toFixed(2)} remaining</span>
                      {plan.EstimatedMonthlyImpact > 0 ? (
                        <span>₹{plan.EstimatedMonthlyImpact.toFixed(2)}/mo planned</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

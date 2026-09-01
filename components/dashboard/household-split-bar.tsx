import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HouseholdSplit } from "@/lib/analytics"

const SEGMENTS: { key: keyof HouseholdSplit; label: string; color: string }[] = [
  { key: "User1", label: "User 1", color: "var(--chart-1)" },
  { key: "User2", label: "User 2", color: "var(--chart-2)" },
]

export function HouseholdSplitBar({ split }: { split: HouseholdSplit }) {
  const total = split.User1 + split.User2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Split</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">No expenses in this period.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {SEGMENTS.map((seg) => {
                const amount = split[seg.key]
                if (amount <= 0) return null
                return (
                  <div
                    key={seg.key}
                    style={{
                      width: `${(amount / total) * 100}%`,
                      backgroundColor: seg.color,
                    }}
                  />
                )
              })}
            </div>
            <div className="flex gap-6 text-sm">
              {SEGMENTS.map((seg) => (
                <span key={seg.key} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span>{seg.label}</span>
                  <span className="text-muted-foreground">
                    ₹{split[seg.key].toFixed(2)} (
                    {((split[seg.key] / total) * 100).toFixed(0)}%)
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

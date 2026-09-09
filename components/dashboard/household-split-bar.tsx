import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HouseholdSplit } from "@/lib/analytics"
import type { AddedBy } from "@/lib/types"

const SEGMENT_KEYS: { key: keyof HouseholdSplit; color: string }[] = [
  { key: "User1", color: "var(--chart-1)" },
  { key: "User2", color: "var(--chart-2)" },
]

export function HouseholdSplitBar({
  split,
  names,
}: {
  split: HouseholdSplit
  names: Record<AddedBy, string>
}) {
  const total = split.User1 + split.User2

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-normal">
          Household Split
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">No expenses in this period.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {SEGMENT_KEYS.map((seg) => {
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
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
              {SEGMENT_KEYS.map((seg) => (
                <span key={seg.key} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-medium">{names[seg.key]}</span>
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

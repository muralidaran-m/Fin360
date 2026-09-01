"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BudgetBreakdown } from "@/lib/analytics"

const SLOTS: { key: keyof BudgetBreakdown; color: string }[] = [
  { key: "Need", color: "var(--chart-1)" },
  { key: "Want", color: "var(--chart-2)" },
  { key: "Savings", color: "var(--chart-3)" },
]

export function BreakdownDonut({ breakdown }: { breakdown: BudgetBreakdown }) {
  const total = breakdown.Need + breakdown.Want + breakdown.Savings
  const data = SLOTS.map(({ key, color }) => ({
    name: key,
    value: breakdown[key],
    color,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>50/30/20 Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">No expenses in this period.</p>
        ) : (
          <div className="flex items-center gap-6">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="60%"
                    outerRadius="100%"
                    paddingAngle={3}
                    cornerRadius={4}
                    stroke="none"
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${Number(value).toFixed(2)}`}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--popover-foreground)",
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-2">
              {data.map((entry) => (
                <li key={entry.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="flex-1">{entry.name}</span>
                  <span className="text-muted-foreground">
                    ₹{entry.value.toFixed(2)}
                    {total > 0 ? ` (${((entry.value / total) * 100).toFixed(0)}%)` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

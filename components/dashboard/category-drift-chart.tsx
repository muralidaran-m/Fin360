"use client"

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CategoryDrift } from "@/lib/analytics"

export function CategoryDriftChart({ drift }: { drift: CategoryDrift[] }) {
  const data = drift.map((d) => ({
    ...d,
    percent: Math.round(d.percentChange * 100),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Drift</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No categories are ±15% off their 3-month average.
          </p>
        ) : (
          <>
            <div style={{ height: Math.max(data.length * 40, 80) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 4, right: 32, left: 0, bottom: 4 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="categoryName"
                    tick={{ fill: "var(--foreground)", fontSize: 13 }}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip
                    formatter={(_value, _name, item) => {
                      const payload = item.payload as (typeof data)[number]
                      return [
                        `₹${payload.current.toFixed(2)} (avg ₹${payload.trailingAverage.toFixed(2)})`,
                        "vs 3-mo average",
                      ]
                    }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--popover-foreground)",
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="percent" radius={4} barSize={20}>
                    {data.map((entry) => (
                      <Cell
                        key={entry.categoryId}
                        fill={
                          entry.percent > 0
                            ? "var(--status-critical)"
                            : "var(--status-good)"
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="percent"
                      position="right"
                      formatter={(v) => `${Number(v) > 0 ? "+" : ""}${v}%`}
                      fill="var(--foreground)"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: "var(--status-critical)" }}
                />
                <span className="text-muted-foreground">Over average</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: "var(--status-good)" }}
                />
                <span className="text-muted-foreground">Under average</span>
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

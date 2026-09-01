"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { BurnRatePoint } from "@/lib/analytics"

export function BurnRateChart({ points }: { points: BurnRatePoint[] }) {
  const hasData = points.some((p) => !Number.isNaN(p.actual) && p.actual > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Burn Rate &amp; Runway</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-muted-foreground text-sm">No spending yet this month.</p>
        ) : (
          <>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(v: number) => `₹${v}`}
                  />
                  <Tooltip
                    formatter={(value) => `₹${Number(value).toFixed(2)}`}
                    labelFormatter={(day) => `Day ${day}`}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--popover-foreground)",
                      fontSize: 13,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    stroke="var(--muted-foreground)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Baseline"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "var(--chart-1)", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    name="Actual"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
                <span className="text-muted-foreground">Actual</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full border-t-2 border-dashed" style={{ borderColor: "var(--muted-foreground)" }} />
                <span className="text-muted-foreground">Baseline (3-mo avg)</span>
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  spendByDimension,
  type BreakdownDimension,
  type DateRange,
} from "@/lib/analytics"
import type { Category, Transaction } from "@/lib/types"

const DIMENSIONS: { value: BreakdownDimension; label: string }[] = [
  { value: "category", label: "Category" },
  { value: "paymentMode", label: "Payment type" },
  { value: "recurring", label: "Recurring" },
]

const DIMENSION_LABELS: Record<BreakdownDimension, string> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.value, d.label])
) as Record<BreakdownDimension, string>

export function SpendBarChart({
  transactions,
  categoriesById,
  range,
}: {
  transactions: Transaction[]
  categoriesById: Map<string, Category>
  range: DateRange
}) {
  const [dimension, setDimension] = useState<BreakdownDimension>("category")

  const data = useMemo(
    () => spendByDimension(transactions, categoriesById, range, dimension),
    [transactions, categoriesById, range, dimension]
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Spend Breakdown</CardTitle>
        <Select
          value={dimension}
          onValueChange={(value) => setDimension(value as BreakdownDimension)}
        >
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: BreakdownDimension) => DIMENSION_LABELS[value]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DIMENSIONS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">No expenses in this period.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  interval={0}
                  angle={data.length > 5 ? -20 : 0}
                  textAnchor={data.length > 5 ? "end" : "middle"}
                  height={data.length > 5 ? 50 : 30}
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
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--popover-foreground)",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="amount" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

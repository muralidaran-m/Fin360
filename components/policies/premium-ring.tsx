"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

export function PremiumRing({
  paid,
  total,
}: {
  paid: number
  /** null for open-ended plans (e.g. an SIP with no fixed term). */
  total: number | null
}) {
  const data =
    total === null
      ? [{ name: "Paid", value: 1, color: "var(--section-policies)" }]
      : [
          { name: "Paid", value: paid, color: "var(--section-policies)" },
          { name: "Remaining", value: Math.max(0, total - paid), color: "var(--muted)" },
        ]

  return (
    <div className="relative size-28 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold leading-none">
          {paid}
          {total === null ? "" : <span className="text-muted-foreground text-sm">/{total}</span>}
        </span>
        <span className="text-muted-foreground mt-1 text-[11px]">
          {total === null ? "paid, ongoing" : "premiums"}
        </span>
      </div>
    </div>
  )
}

"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"

import { TOOLTIP_STYLE } from "@/components/policies/chart-tooltip"
import type { PhaseKey, PolicyPhase } from "@/lib/policy"

export type TimelineRow = {
  nickname: string
  phases: PolicyPhase[]
  payoutOpenEnded: boolean
}

const PHASES: { key: PhaseKey; label: string; color: string }[] = [
  { key: "premium", label: "Premium-paying", color: "var(--chart-1)" },
  { key: "accumulation", label: "Accumulation", color: "var(--chart-4)" },
  { key: "payout", label: "Payout", color: "var(--chart-3)" },
]

/** Smallest visible width (in years) for a phase, so a one-day maturity still shows. */
const MIN_PHASE_YEARS = 0.25

function yearFraction(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number)
  const start = Date.UTC(y, 0, 1)
  const days = (Date.UTC(y, m - 1, d) - start) / 86_400_000
  return y + days / 365.25
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

type ChartDatum = {
  nickname: string
  base: number
  premium: number
  accumulation: number
  payout: number
  row: TimelineRow
}

function TimelineTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const { row } = payload[0].payload as ChartDatum
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <div className="mb-1 font-medium">{row.nickname}</div>
      {PHASES.map(({ key, label, color }) => {
        const phase = row.phases.find((p) => p.key === key)!
        if (phase.start === phase.end) return null
        const ongoing = key === "payout" && row.payoutOpenEnded
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ backgroundColor: color }} />
            <span>
              {label}: {formatDate(phase.start)} – {ongoing ? "lifelong" : formatDate(phase.end)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function PolicyTimelineChart({ rows, today }: { rows: TimelineRow[]; today: string }) {
  const data: ChartDatum[] = rows.map((row) => {
    const width = (key: PhaseKey) => {
      const p = row.phases.find((x) => x.key === key)!
      const years = yearFraction(p.end) - yearFraction(p.start)
      // Skip zero-length accumulation entirely; keep a sliver for point-in-time payouts.
      if (years <= 0) return key === "payout" ? MIN_PHASE_YEARS : 0
      return years
    }
    return {
      nickname: row.nickname,
      base: yearFraction(row.phases[0].start),
      premium: width("premium"),
      accumulation: width("accumulation"),
      payout: width("payout"),
      row,
    }
  })

  const todayYear = yearFraction(today)
  const minYear = Math.floor(Math.min(todayYear, ...data.map((d) => d.base)))
  const maxYear = Math.ceil(
    Math.max(todayYear, ...data.map((d) => d.base + d.premium + d.accumulation + d.payout))
  )

  return (
    <div>
      <div className="w-full" style={{ height: 56 + rows.length * 44 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 16, left: 0, bottom: 0 }}
            barCategoryGap={10}
          >
            <CartesianGrid stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              domain={[minYear, maxYear]}
              allowDataOverflow
              tickCount={Math.min(12, maxYear - minYear + 1)}
              tickFormatter={(v: number) => String(Math.round(v))}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              type="category"
              dataKey="nickname"
              width={110}
              tick={{ fill: "var(--foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={TimelineTooltip} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
            <Bar dataKey="base" stackId="t" fill="transparent" isAnimationActive={false} />
            {PHASES.map(({ key, label, color }) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="t"
                fill={color}
                stroke="var(--card)"
                strokeWidth={2}
                name={label}
                isAnimationActive={false}
              />
            ))}
            <ReferenceLine
              x={todayYear}
              stroke="var(--foreground)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: "Today",
                position: "top",
                fill: "var(--foreground)",
                fontSize: 12,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
        {PHASES.map(({ key, label, color }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

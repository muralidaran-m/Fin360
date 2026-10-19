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
  type YAxisTickContentProps,
} from "recharts"

import { TOOLTIP_STYLE } from "@/components/policies/chart-tooltip"
import type { PhaseKey, PolicyPhase } from "@/lib/policy"

export type TimelineRow = {
  nickname: string
  /** Shown on the axis; plan names read better than kebab-case nicknames. */
  label: string
  phases: PolicyPhase[]
  payoutOpenEnded: boolean
}

const LABEL_WIDTH = 168
const LABEL_FONT_SIZE = 12
// Rough average glyph width for the 12px UI font; only used to decide where to wrap.
const LABEL_CHAR_PX = 6.6
const LABEL_MAX_LINES = 2

/** Greedy word wrap into at most LABEL_MAX_LINES lines, ellipsising the last one. */
function wrapLabel(text: string): string[] {
  const maxChars = Math.floor((LABEL_WIDTH - 12) / LABEL_CHAR_PX)
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (next.length <= maxChars || !line) {
      line = next
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length > LABEL_MAX_LINES) {
    lines.length = LABEL_MAX_LINES
    lines[LABEL_MAX_LINES - 1] = `${lines[LABEL_MAX_LINES - 1].slice(0, maxChars - 1)}…`
  }
  return lines.map((l) => (l.length > maxChars ? `${l.slice(0, maxChars - 1)}…` : l))
}

function TimelineLabel({ x, y, payload }: YAxisTickContentProps) {
  const anchorX = Number(x) - 8
  const label = String(payload.value)
  const lines = wrapLabel(label)
  const lineHeight = LABEL_FONT_SIZE + 3
  const firstDy = -((lines.length - 1) * lineHeight) / 2
  return (
    <text
      x={anchorX}
      y={y}
      textAnchor="end"
      dominantBaseline="central"
      fill="var(--foreground)"
      fontSize={LABEL_FONT_SIZE}
    >
      <title>{label}</title>
      {lines.map((line, i) => (
        <tspan key={i} x={anchorX} dy={i === 0 ? firstDy : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
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
  label: string
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
      <div className="font-medium">{row.label}</div>
      <div className="text-muted-foreground mb-1 text-xs">{row.nickname}</div>
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
      label: row.label,
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
      <div className="w-full" style={{ height: 56 + rows.length * 48 }}>
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
              dataKey="label"
              width={LABEL_WIDTH}
              tick={TimelineLabel}
              interval={0}
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

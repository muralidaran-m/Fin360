"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"

import { formatRupees, formatRupeesShort, TOOLTIP_STYLE } from "@/components/policies/chart-tooltip"
import type { PayoutBar } from "@/lib/policy"

const KIND_LABELS: Record<PayoutBar["kind"], string> = {
  survival_benefit: "Survival benefit",
  maturity: "Maturity",
  annuity: "Pension",
  child_milestone: "Child milestone",
}

const GUARANTEED_COLOR = "var(--chart-3)"
const ILLUSTRATIVE_COLOR = "var(--chart-4)"

function PayoutTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const bar = payload[0].payload as PayoutBar & { index: number }
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <div className="font-medium">
        {bar.label} · {KIND_LABELS[bar.kind]}
      </div>
      {bar.guaranteed > 0 ? <div>Guaranteed: {formatRupees(bar.guaranteed)}</div> : null}
      {bar.illustrative > 0 ? (
        <div>Illustrative: {formatRupees(bar.illustrative)}</div>
      ) : null}
      {bar.note ? <div className="text-muted-foreground mt-0.5 text-xs">{bar.note}</div> : null}
    </div>
  )
}

export function PayoutScheduleChart({ bars }: { bars: PayoutBar[] }) {
  // Several payouts can share a year (e.g. guaranteed sum + bonus at maturity): merge per label.
  const merged = new Map<string, PayoutBar>()
  for (const b of bars) {
    const prev = merged.get(b.label)
    merged.set(
      b.label,
      prev
        ? {
            ...prev,
            guaranteed: prev.guaranteed + b.guaranteed,
            illustrative: prev.illustrative + b.illustrative,
            note: [prev.note, b.note].filter(Boolean).join(" · "),
          }
        : b
    )
  }
  const data = [...merged.values()]

  return (
    <div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={formatRupeesShort}
            />
            <Tooltip content={PayoutTooltip} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
            <Bar
              dataKey="guaranteed"
              stackId="payout"
              fill={GUARANTEED_COLOR}
              stroke="var(--card)"
              strokeWidth={2}
              maxBarSize={40}
              name="Guaranteed"
            />
            <Bar
              dataKey="illustrative"
              stackId="payout"
              fill={ILLUSTRATIVE_COLOR}
              stroke="var(--card)"
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              name="Illustrative"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: GUARANTEED_COLOR }} />
          <span className="text-muted-foreground">Guaranteed</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: ILLUSTRATIVE_COLOR }} />
          <span className="text-muted-foreground">Illustrative (not guaranteed)</span>
        </span>
      </div>
    </div>
  )
}

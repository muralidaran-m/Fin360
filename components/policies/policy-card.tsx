"use client"

import { CheckCircle2, Info } from "lucide-react"

import { formatRupees } from "@/components/policies/chart-tooltip"
import { PayoutScheduleChart } from "@/components/policies/payout-schedule-chart"
import { PremiumRing } from "@/components/policies/premium-ring"
import { UpdateFundValueButton } from "@/components/policies/update-fund-value-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  countdown,
  formatCountdown,
  fundValue,
  isMarketLinked,
  PHASE_LABELS,
  type PolicyInsight,
} from "@/lib/policy"
import type { PolicyType } from "@/lib/types"

const TYPE_LABELS: Record<PolicyType, string> = {
  retirement: "Retirement",
  child: "Child plan",
  ulip: "ULIP",
  mf: "Mutual fund",
}

const FREQUENCY_LABELS = {
  annual: "per year",
  "half-yearly": "every 6 months",
  quarterly: "per quarter",
  monthly: "per month",
  single: "single premium",
} as const

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function fundValueHint(fv: NonNullable<ReturnType<typeof fundValue>>): string {
  const asOf = `as of ${formatDate(fv.asOf)}`
  if (fv.gain === null || !fv.paidByThen) return asOf
  const sign = fv.gain >= 0 ? "+" : "−"
  const pct = Math.abs((fv.gain / fv.paidByThen) * 100).toFixed(1)
  return `${asOf} · ${sign}${formatRupees(Math.abs(fv.gain))} (${sign}${pct}%) vs paid`
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold">{value}</span>
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </div>
  )
}

/** One line shown under the title while the card is collapsed. */
function collapsedSummary(insight: PolicyInsight): string {
  const { policy, schedule, milestone } = insight
  const parts: string[] = []
  if (policy.PremiumAmount !== null) {
    parts.push(`${formatRupees(policy.PremiumAmount)} ${FREQUENCY_LABELS[policy.PremiumFrequency]}`)
  }
  if (schedule.totalInstallments !== null) {
    parts.push(`${schedule.installmentsPaid}/${schedule.totalInstallments} paid`)
  }
  if (milestone) parts.push(`${milestone.label} in ${formatCountdown(milestone.countdown)}`)
  return parts.join(" · ")
}

export function PolicyCard({
  insight,
  today,
  open,
  onOpenChange,
}: {
  insight: PolicyInsight
  today: Date
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { policy, schedule, milestone } = insight
  const nextDue = schedule.nextDueDate ? countdown(today, schedule.nextDueDate) : null
  const marketLinked = isMarketLinked(policy)
  const fv = marketLinked ? fundValue(policy) : null

  return (
    <Card>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <CollapsibleTrigger className="min-w-0 flex-1 items-start">
            <div className="flex min-w-0 flex-col gap-0.5">
              <CardTitle>{policy.Nickname}</CardTitle>
              <span className="text-muted-foreground text-xs">
                {policy.Insurer} · {policy.PlanName}
                {policy.PolicyNoLast4 ? ` · ••••${policy.PolicyNoLast4}` : ""}
              </span>
              {open ? null : (
                <span className="text-muted-foreground text-xs">{collapsedSummary(insight)}</span>
              )}
            </div>
          </CollapsibleTrigger>
          <div className="flex gap-1.5">
            <Badge variant="outline">{TYPE_LABELS[policy.Type]}</Badge>
            <Badge variant="secondary">{PHASE_LABELS[insight.currentPhase]}</Badge>
          </div>
        </CardHeader>
        <CollapsiblePanel>
          <CardContent className="flex flex-col gap-5">
            {policy.IllustrativeOnly ? (
              <div className="bg-accent text-accent-foreground flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Figures in this document are illustrative — they depend on assumed returns and are
                  not promised by the insurer.
                </span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-6">
              <PremiumRing paid={schedule.installmentsPaid} total={schedule.totalInstallments} />
              <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <Stat
                  label="Premium"
                  value={policy.PremiumAmount === null ? "—" : formatRupees(policy.PremiumAmount)}
                  hint={FREQUENCY_LABELS[policy.PremiumFrequency]}
                />
                <Stat
                  label="Paid so far"
                  value={schedule.paidAmount === null ? "—" : formatRupees(schedule.paidAmount)}
                  hint={
                    schedule.remainingAmount === null
                      ? schedule.totalInstallments === null
                        ? "no fixed term"
                        : undefined
                      : `${formatRupees(schedule.remainingAmount)} to go`
                  }
                />
                <Stat
                  label="Next premium"
                  value={schedule.nextDueDate ? formatDate(schedule.nextDueDate) : "All paid"}
                  hint={nextDue ? `in ${formatCountdown(nextDue)}` : undefined}
                />
                {milestone ? (
                  <Stat
                    label={milestone.label}
                    value={formatCountdown(milestone.countdown)}
                    hint={formatDate(milestone.date)}
                  />
                ) : null}
                {policy.SumAssured !== null ? (
                  <Stat label="Sum assured" value={formatRupees(policy.SumAssured)} />
                ) : null}
                {marketLinked ? (
                  <Stat
                    label="Fund value"
                    value={fv ? formatRupees(fv.value) : "—"}
                    hint={fv ? fundValueHint(fv) : "Not entered yet"}
                  />
                ) : null}
              </div>
            </div>

            {marketLinked ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {fv
                    ? `${fv.units.toLocaleString("en-IN", { maximumFractionDigits: 4 })} units × ₹${fv.nav.toLocaleString("en-IN", { maximumFractionDigits: 4 })} NAV`
                    : "Add units and NAV from your statement to track this fund's value."}
                </span>
                <UpdateFundValueButton policy={policy} />
              </div>
            ) : null}

            {insight.payoutBars.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">Payout schedule</h3>
                  <span className="text-muted-foreground text-xs">
                    {formatRupees(insight.guaranteedTotal)} guaranteed
                    {insight.illustrativeTotal > 0
                      ? ` + ${formatRupees(insight.illustrativeTotal)} illustrative`
                      : ""}
                  </span>
                </div>
                <PayoutScheduleChart bars={insight.payoutBars} />
              </div>
            ) : null}

            {insight.unquantifiedPayouts.length > 0 ? (
              <p className="text-muted-foreground text-xs">
                Also listed without an amount:{" "}
                {insight.unquantifiedPayouts.map((p) => p.Note || p.Kind).join("; ")}
              </p>
            ) : null}

            {policy.Summary || policy.Benefits.length > 0 || policy.Riders.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 className="font-medium">What this policy gives you</h3>
                {policy.Summary ? (
                  <p className="text-muted-foreground">{policy.Summary}</p>
                ) : null}
                {policy.Benefits.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {policy.Benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2
                          className="mt-0.5 size-4 shrink-0"
                          style={{ color: "var(--section-policies)" }}
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {policy.Riders.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-muted-foreground text-xs">Riders:</span>
                    {policy.Riders.map((rider) => (
                      <Badge key={rider} variant="outline">
                        {rider}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </CollapsiblePanel>
      </Collapsible>
    </Card>
  )
}

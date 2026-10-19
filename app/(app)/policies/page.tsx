import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

import { v4 as uuid } from "uuid"

import { PolicyCard } from "@/components/policies/policy-card"
import { PolicyTimelineChart } from "@/components/policies/policy-timeline-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPolicies, getPolicyPayouts } from "@/lib/data"
import { buildPolicyInsight, planToRecords, toISODate } from "@/lib/policy"
import type { Policy, PolicyPayout } from "@/lib/types"
import { policyPlanSchema } from "@/lib/validation"

export const dynamic = "force-dynamic"

const SAMPLES_DIR = path.join(process.cwd(), "data", "samples")

/**
 * Development-only preview (`/policies?sample=1`): renders the fake plans in
 * data/samples/ without writing them to the sheet. Never reads anything else.
 */
async function loadSamplePolicies(): Promise<{ policies: Policy[]; payouts: PolicyPayout[] }> {
  const files = (await readdir(SAMPLES_DIR)).filter((f) => f.endsWith(".plan.json"))
  const policies: Policy[] = []
  const payouts: PolicyPayout[] = []
  for (const file of files) {
    const parsed = policyPlanSchema.safeParse(
      JSON.parse(await readFile(path.join(SAMPLES_DIR, file), "utf-8"))
    )
    if (!parsed.success) continue
    const records = planToRecords(parsed.data, uuid(), uuid, new Date())
    policies.push(records.policy)
    payouts.push(...records.payouts)
  }
  return { policies, payouts }
}

async function loadPolicies(useSamples: boolean) {
  if (useSamples) return loadSamplePolicies()
  try {
    const [policies, payouts] = await Promise.all([getPolicies(), getPolicyPayouts()])
    return { policies, payouts }
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found in workbook")) {
      return null
    }
    throw err
  }
}

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { sample } = await searchParams
  const useSamples = process.env.NODE_ENV === "development" && sample === "1"
  const data = await loadPolicies(useSamples)

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            The Policies sheets don&apos;t exist yet. Run <code>npm run init-sheets</code>, then
            add a policy with <code>npm run policy:apply -- --plan=&lt;file&gt; --apply</code>.
          </p>
        </CardContent>
      </Card>
    )
  }

  const today = new Date()
  const payoutsByPolicy = new Map<string, PolicyPayout[]>()
  for (const p of data.payouts) {
    payoutsByPolicy.set(p.PolicyID, [...(payoutsByPolicy.get(p.PolicyID) ?? []), p])
  }
  const insights = [...data.policies]
    .sort((a, b) => a.StartDate.localeCompare(b.StartDate))
    .map((policy) =>
      buildPolicyInsight(policy, payoutsByPolicy.get(policy.PolicyID) ?? [], today)
    )

  return (
    <div className="flex flex-col gap-6">
      {useSamples ? (
        <p className="text-muted-foreground text-xs">
          Showing fake sample plans from data/samples (development preview).
        </p>
      ) : null}

      {insights.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              No policies yet. Add one with{" "}
              <code>npm run policy:apply -- --plan=&lt;file&gt; --apply</code>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Policy timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <PolicyTimelineChart
                today={toISODate(today)}
                rows={insights.map((i) => ({
                  nickname: i.policy.Nickname,
                  phases: i.phases.phases,
                  payoutOpenEnded: i.phases.payoutOpenEnded,
                }))}
              />
            </CardContent>
          </Card>

          {insights.map((insight) => (
            <PolicyCard key={insight.policy.PolicyID} insight={insight} today={today} />
          ))}

          <p className="text-muted-foreground text-xs">
            Premium progress assumes every installment was paid on its due date.
          </p>
        </>
      )}
    </div>
  )
}

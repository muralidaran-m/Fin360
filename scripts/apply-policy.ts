import { readFile } from "node:fs/promises"

import { v4 as uuid } from "uuid"

import { connectToSheet } from "@/scripts/lib/connect"
import {
  buildPolicyInsight,
  formatCountdown,
  payoutToRow,
  planToRecords,
  policyToRow,
  PHASE_LABELS,
} from "@/lib/policy"
import { SHEET_NAMES } from "@/lib/types"
import { policyPlanSchema, type PolicyPlan } from "@/lib/validation"

// Applies a reviewed policy plan JSON (from scripts/policy-ingest) to the
// Policies / Policy_Payouts sheets. Dry run by default; pass --apply to write.
//
// Only ever print fields that passed policyPlanSchema. Validation errors are
// reported by path and code only, never by value, so a malformed plan can't
// echo raw document text to the terminal.

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {}
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue
    const body = arg.slice(2)
    const eq = body.indexOf("=")
    if (eq === -1) {
      args[body] = true
    } else {
      args[body.slice(0, eq)] = body.slice(eq + 1)
    }
  }
  return args
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function loadPlan(planPath: string): Promise<PolicyPlan> {
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(planPath, "utf-8"))
  } catch {
    fail(`Could not read ${planPath} as JSON.`)
  }

  const result = policyPlanSchema.safeParse(raw)
  if (!result.success) {
    console.error(`Plan failed validation (${result.error.issues.length} issue(s)):`)
    for (const issue of result.error.issues) {
      const extra = issue.code === "unrecognized_keys" ? ` [${issue.keys.join(", ")}]` : ""
      console.error(`- ${issue.path.join(".") || "(root)"}: ${issue.code}${extra}`)
    }
    process.exit(1)
  }
  return result.data
}

function rupees(n: number | null): string {
  return n === null ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function printSummary(plan: PolicyPlan): void {
  const p = plan.policy
  const { policy, payouts } = planToRecords(plan, "preview", () => "preview", new Date())
  const insight = buildPolicyInsight(policy, payouts, new Date())
  const s = insight.schedule

  console.log(`Policy "${p.nickname}" — ${p.insurer} · ${p.planName} (${p.type})`)
  if (p.policyNoLast4) console.log(`  Policy no.:   ••••${p.policyNoLast4}`)
  console.log(`  Start:        ${p.startDate}`)
  console.log(
    `  Premium:      ${rupees(p.premiumAmount)} ${p.premiumFrequency}` +
      (p.premiumPayingTermYrs ? ` for ${p.premiumPayingTermYrs} yrs` : "")
  )
  console.log(
    `  Paid so far:  ${s.installmentsPaid}${s.totalInstallments === null ? "" : `/${s.totalInstallments}`} installments (${rupees(s.paidAmount)}), next due ${s.nextDueDate ?? "—"}`
  )
  if (p.sumAssured !== null) console.log(`  Sum assured:  ${rupees(p.sumAssured)}`)
  if (insight.milestone) {
    console.log(
      `  ${insight.milestone.label}:${" ".repeat(Math.max(1, 13 - insight.milestone.label.length))}${insight.milestone.date} (${formatCountdown(insight.milestone.countdown)})`
    )
  }
  console.log(`  Phase now:    ${PHASE_LABELS[insight.currentPhase]}`)
  console.log(`  Riders:       ${p.riders.length ? p.riders.join(", ") : "—"}`)
  console.log(`  Benefits:     ${p.benefits.length}`)
  console.log(
    `  Payouts:      ${plan.payouts.length} (guaranteed ${rupees(insight.guaranteedTotal)}, illustrative ${rupees(insight.illustrativeTotal)}, ${insight.unquantifiedPayouts.length} without amount)`
  )
  if (p.illustrativeOnly) console.log("  Note:         figures are illustrative only")
}

async function apply(plan: PolicyPlan): Promise<void> {
  const doc = await connectToSheet()
  const policiesSheet = doc.sheetsByTitle[SHEET_NAMES.Policies]
  const payoutsSheet = doc.sheetsByTitle[SHEET_NAMES.PolicyPayouts]
  if (!policiesSheet || !payoutsSheet) {
    fail("Policies/Policy_Payouts sheet not found — run `npm run init-sheets` first.")
  }

  const policyRows = await policiesSheet.getRows()
  const existing = policyRows.find((r) => r.get("Nickname") === plan.policy.nickname)
  const policyId: string = existing?.get("PolicyID") || uuid()
  const { policy, payouts } = planToRecords(plan, policyId, uuid, new Date())

  if (existing) {
    existing.assign(policyToRow(policy))
    await existing.save()
  } else {
    await policiesSheet.addRow(policyToRow(policy))
  }

  // Replace the payout schedule wholesale; delete bottom-up so row indexes stay valid.
  const stalePayouts = (await payoutsSheet.getRows()).filter((r) => r.get("PolicyID") === policyId)
  for (const row of stalePayouts.reverse()) {
    await row.delete()
  }
  if (payouts.length > 0) {
    await payoutsSheet.addRows(payouts.map(payoutToRow))
  }

  console.log(`${existing ? "Updated" : "Created"} policy "${policy.Nickname}" (${policyId})`)
  console.log(`Payouts: ${stalePayouts.length} removed, ${payouts.length} inserted`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (typeof args.plan !== "string") {
    fail("Usage: npm run policy:apply -- --plan=<path/to/nickname.plan.json> [--apply]")
  }

  const plan = await loadPlan(args.plan)
  printSummary(plan)

  if (!args.apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write to the sheet.")
    return
  }
  await apply(plan)
}

main().catch((err: unknown) => {
  // Sheet/API errors only; plan contents never reach here.
  console.error(err instanceof Error ? err.message : "Unexpected error")
  process.exit(1)
})

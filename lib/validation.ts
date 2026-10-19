import { z } from "zod"

import { CATEGORY_ICON_NAMES } from "@/lib/icons"

export const categorySchema = z.object({
  Name: z.string().trim().min(1, "Name is required").max(60),
  Type: z.enum(["Need", "Want", "Income", "Savings"]),
  Icon: z.enum(CATEGORY_ICON_NAMES as [string, ...string[]]),
  ColorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #4f46e5"),
})

export type CategoryFormValues = z.infer<typeof categorySchema>

export const PAYMENT_MODE_KINDS = ["Ordinary", "CreditCard"] as const

export const paymentModeSchema = z
  .object({
    Name: z.string().trim().min(1, "Name is required").max(40),
    Kind: z.enum(PAYMENT_MODE_KINDS),
    StatementDay: z.coerce.number().int().min(0).max(31),
    DueDays: z.coerce.number().int().min(0).max(60),
  })
  .superRefine((data, ctx) => {
    if (data.Kind !== "CreditCard") return
    if (data.StatementDay < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["StatementDay"],
        message: "Statement day is required for credit cards",
      })
    }
    if (data.DueDays < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["DueDays"],
        message: "Due days is required for credit cards",
      })
    }
  })

export type PaymentModeFormValues = z.infer<typeof paymentModeSchema>

export const eventSchema = z.object({
  Name: z.string().trim().min(1, "Name is required").max(60),
})

export type EventFormValues = z.infer<typeof eventSchema>

export const transactionSchema = z.object({
  Amount: z.coerce
    .number({ invalid_type_error: "Amount is required" })
    .positive("Amount must be greater than 0"),
  CategoryID: z.string().min(1, "Category is required"),
  Date: z.string().min(1, "Date is required"),
  Note: z.string().trim().max(200),
  IsRecurring: z.boolean(),
  AddedBy: z.enum(["User1", "User2"]),
  PaymentModeID: z.string().min(1, "Payment mode is required"),
  EventID: z.string(),
  BillDate: z
    .string()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid bill date"),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>

export const householdSettingsSchema = z.object({
  User1Name: z.string().trim().min(1, "Name is required").max(40),
  User2Name: z.string().trim().min(1, "Name is required").max(40),
})

export type HouseholdSettingsFormValues = z.infer<typeof householdSettingsSchema>

export const sandboxPlanSchema = z.object({
  PlanName: z.string().trim().min(1, "Name is required").max(60),
  TargetAmount: z.coerce
    .number({ invalid_type_error: "Target amount is required" })
    .positive("Target amount must be greater than 0"),
  CurrentSaved: z.coerce
    .number({ invalid_type_error: "Amount saved is required" })
    .min(0, "Amount saved cannot be negative"),
  TargetDate: z.string().min(1, "Target date is required"),
  EstimatedMonthlyImpact: z.coerce
    .number({ invalid_type_error: "Monthly contribution is required" })
    .min(0, "Monthly contribution cannot be negative"),
})

export type SandboxPlanFormValues = z.infer<typeof sandboxPlanSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
const money = z.number().nonnegative()

export const POLICY_TYPES = ["retirement", "child", "ulip", "mf"] as const
export const PREMIUM_FREQUENCIES = [
  "annual",
  "half-yearly",
  "quarterly",
  "monthly",
  "single",
] as const
export const PAYOUT_KINDS = [
  "survival_benefit",
  "maturity",
  "annuity",
  "child_milestone",
] as const

/**
 * Contract for the plan JSON produced by scripts/policy-ingest (the PII-redacting
 * sidecar). Strict: unknown keys are rejected so nothing beyond these non-PII
 * fields can slip into the sheet.
 */
export const policyPlanSchema = z
  .object({
    policy: z
      .object({
        nickname: z.string().trim().min(1).max(60),
        insurer: z.string().trim().min(1).max(80),
        planName: z.string().trim().min(1).max(120),
        type: z.enum(POLICY_TYPES),
        policyNoLast4: z
          .string()
          .regex(/^[A-Za-z0-9]{1,4}$/, "At most 4 alphanumeric characters")
          .nullable(),
        startDate: isoDate,
        premiumAmount: money.nullable(),
        premiumFrequency: z.enum(PREMIUM_FREQUENCIES),
        premiumPayingTermYrs: z.number().int().positive().max(100).nullable(),
        policyTermYrs: z.number().int().positive().max(100).nullable(),
        maturityDate: isoDate.nullable(),
        vestingDate: isoDate.nullable(),
        sumAssured: money.nullable(),
        lockInYrs: z.number().int().nonnegative().max(100).nullable(),
        riders: z.array(z.string().trim().min(1).max(120)).max(30),
        benefits: z.array(z.string().trim().min(1).max(300)).max(30),
        summary: z.string().trim().max(1000),
        illustrativeOnly: z.boolean(),
      })
      .strict(),
    payouts: z
      .array(
        z
          .object({
            date: isoDate.nullable(),
            age: z.number().int().nonnegative().max(120).nullable(),
            amount: money.nullable(),
            percent: z.number().nonnegative().max(1000).nullable(),
            kind: z.enum(PAYOUT_KINDS),
            guaranteed: z.boolean(),
            note: z.string().trim().max(300),
          })
          .strict()
      )
      .max(200),
  })
  .strict()

export type PolicyPlan = z.infer<typeof policyPlanSchema>

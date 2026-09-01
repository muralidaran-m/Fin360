import "server-only"

import { unstable_cache as cache, updateTag } from "next/cache"
import { v4 as uuid } from "uuid"

import { appendRow, getRows, updateRow } from "@/lib/sheets"
import {
  SHEET_NAMES,
  type Category,
  type PaymentMode,
  type SandboxPlan,
  type Transaction,
} from "@/lib/types"

const TAGS = {
  categories: "categories",
  paymentModes: "payment_modes",
  transactions: "transactions",
  sandboxPlans: "sandbox_plans",
} as const

function parseTransaction(raw: Record<string, unknown>): Transaction {
  return {
    ...raw,
    Amount: Number(raw.Amount ?? 0),
    IsRecurring: raw.IsRecurring === true || raw.IsRecurring === "TRUE",
  } as Transaction
}

function parseSandboxPlan(raw: Record<string, unknown>): SandboxPlan {
  return {
    ...raw,
    TargetAmount: Number(raw.TargetAmount ?? 0),
    CurrentSaved: Number(raw.CurrentSaved ?? 0),
    EstimatedMonthlyImpact: Number(raw.EstimatedMonthlyImpact ?? 0),
  } as SandboxPlan
}

export const getCategories = cache(
  async (): Promise<Category[]> => getRows<Category>(SHEET_NAMES.Categories),
  ["categories"],
  { tags: [TAGS.categories] }
)

export const getTransactions = cache(
  async (): Promise<Transaction[]> => {
    const rows = await getRows<Record<string, unknown>>(SHEET_NAMES.Transactions)
    return rows.map(parseTransaction)
  },
  ["transactions"],
  { tags: [TAGS.transactions] }
)

export const getPaymentModes = cache(
  async (): Promise<PaymentMode[]> => getRows<PaymentMode>(SHEET_NAMES.PaymentModes),
  ["payment_modes"],
  { tags: [TAGS.paymentModes] }
)

export const getSandboxPlans = cache(
  async (): Promise<SandboxPlan[]> => {
    const rows = await getRows<Record<string, unknown>>(SHEET_NAMES.SandboxPlans)
    return rows.map(parseSandboxPlan)
  },
  ["sandbox_plans"],
  { tags: [TAGS.sandboxPlans] }
)

export async function addCategory(
  input: Omit<Category, "CategoryID">
): Promise<Category> {
  const category: Category = { ...input, CategoryID: uuid() }
  await appendRow(SHEET_NAMES.Categories, category)
  updateTag(TAGS.categories)
  return category
}

export async function addPaymentMode(
  input: Omit<PaymentMode, "PaymentModeID">
): Promise<PaymentMode> {
  const paymentMode: PaymentMode = { ...input, PaymentModeID: uuid() }
  await appendRow(SHEET_NAMES.PaymentModes, paymentMode)
  updateTag(TAGS.paymentModes)
  return paymentMode
}

export async function addTransaction(
  input: Omit<Transaction, "TxID">
): Promise<Transaction> {
  const transaction: Transaction = { ...input, TxID: uuid() }
  await appendRow(SHEET_NAMES.Transactions, transaction)
  updateTag(TAGS.transactions)
  return transaction
}

export async function addSandboxPlan(
  input: Omit<SandboxPlan, "PlanID">
): Promise<SandboxPlan> {
  const plan: SandboxPlan = { ...input, PlanID: uuid() }
  await appendRow(SHEET_NAMES.SandboxPlans, plan)
  updateTag(TAGS.sandboxPlans)
  return plan
}

export async function updateSandboxPlan(
  planId: string,
  input: Partial<Omit<SandboxPlan, "PlanID">>
): Promise<void> {
  await updateRow(SHEET_NAMES.SandboxPlans, "PlanID", planId, input)
  updateTag(TAGS.sandboxPlans)
}

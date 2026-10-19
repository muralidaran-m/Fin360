import "server-only"

import { unstable_cache as cache, updateTag } from "next/cache"
import { v4 as uuid } from "uuid"

import { appendRow, deleteRow, getRows, updateRow, upsertRow } from "@/lib/sheets"
import {
  DEFAULT_ADDED_BY_NAMES,
  SETTING_KEYS,
  SHEET_NAMES,
  type AddedBy,
  type Category,
  type Event,
  type PaymentMode,
  type Policy,
  type PolicyPayout,
  type SandboxPlan,
  type Setting,
  type Transaction,
} from "@/lib/types"

const TAGS = {
  categories: "categories",
  paymentModes: "payment_modes",
  events: "events",
  transactions: "transactions",
  sandboxPlans: "sandbox_plans",
  settings: "settings",
  policies: "policies",
  policyPayouts: "policy_payouts",
} as const

function parseTransaction(raw: Record<string, unknown>): Transaction {
  return {
    ...raw,
    Amount: Number(raw.Amount ?? 0),
    IsRecurring: raw.IsRecurring === true || raw.IsRecurring === "TRUE",
  } as Transaction
}

function parsePaymentMode(raw: Record<string, unknown>): PaymentMode {
  const kind = raw.Kind === "CreditCard" ? "CreditCard" : "Ordinary"
  return {
    ...raw,
    Kind: kind,
    StatementDay: Number(raw.StatementDay) || 0,
    DueDays: Number(raw.DueDays) || 0,
  } as PaymentMode
}

function toPaymentModeWrite(
  input: Omit<PaymentMode, "PaymentModeID">
): Omit<PaymentMode, "PaymentModeID"> {
  const isCreditCard = input.Kind === "CreditCard"
  return {
    Name: input.Name,
    Kind: input.Kind,
    StatementDay: isCreditCard ? input.StatementDay : 0,
    DueDays: isCreditCard ? input.DueDays : 0,
  }
}

function parseSandboxPlan(raw: Record<string, unknown>): SandboxPlan {
  return {
    ...raw,
    TargetAmount: Number(raw.TargetAmount ?? 0),
    CurrentSaved: Number(raw.CurrentSaved ?? 0),
    EstimatedMonthlyImpact: Number(raw.EstimatedMonthlyImpact ?? 0),
  } as SandboxPlan
}

function parseNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === "TRUE"
}

function parseStringArray(value: unknown): string[] {
  if (typeof value !== "string" || value === "") return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []
  } catch {
    return []
  }
}

function parsePolicy(raw: Record<string, unknown>): Policy {
  return {
    ...raw,
    PolicyNoLast4: String(raw.PolicyNoLast4 ?? ""),
    MaturityDate: String(raw.MaturityDate ?? ""),
    VestingDate: String(raw.VestingDate ?? ""),
    PremiumAmount: parseNullableNumber(raw.PremiumAmount),
    PremiumPayingTermYrs: parseNullableNumber(raw.PremiumPayingTermYrs),
    PolicyTermYrs: parseNullableNumber(raw.PolicyTermYrs),
    SumAssured: parseNullableNumber(raw.SumAssured),
    LockInYrs: parseNullableNumber(raw.LockInYrs),
    Riders: parseStringArray(raw.Riders),
    Benefits: parseStringArray(raw.Benefits),
    Summary: String(raw.Summary ?? ""),
    IllustrativeOnly: parseBoolean(raw.IllustrativeOnly),
  } as Policy
}

function parsePolicyPayout(raw: Record<string, unknown>): PolicyPayout {
  return {
    ...raw,
    Date: String(raw.Date ?? ""),
    Age: parseNullableNumber(raw.Age),
    Amount: parseNullableNumber(raw.Amount),
    Percent: parseNullableNumber(raw.Percent),
    Guaranteed: parseBoolean(raw.Guaranteed),
    Note: String(raw.Note ?? ""),
  } as PolicyPayout
}

export const getCategories = cache(
  async (): Promise<Category[]> => {
    const categories = await getRows<Category>(SHEET_NAMES.Categories)
    return categories.sort((a, b) => a.Name.localeCompare(b.Name))
  },
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
  async (): Promise<PaymentMode[]> => {
    const rows = await getRows<Record<string, unknown>>(SHEET_NAMES.PaymentModes)
    return rows.map(parsePaymentMode)
  },
  ["payment_modes"],
  { tags: [TAGS.paymentModes] }
)

export const getEvents = cache(
  async (): Promise<Event[]> => getRows<Event>(SHEET_NAMES.Events),
  ["events"],
  { tags: [TAGS.events] }
)

export const getSandboxPlans = cache(
  async (): Promise<SandboxPlan[]> => {
    const rows = await getRows<Record<string, unknown>>(SHEET_NAMES.SandboxPlans)
    return rows.map(parseSandboxPlan)
  },
  ["sandbox_plans"],
  { tags: [TAGS.sandboxPlans] }
)

export const getPolicies = cache(
  async (): Promise<Policy[]> => {
    const rows = await getRows<Record<string, unknown>>(SHEET_NAMES.Policies)
    return rows.map(parsePolicy)
  },
  ["policies"],
  { tags: [TAGS.policies] }
)

export const getPolicyPayouts = cache(
  async (): Promise<PolicyPayout[]> => {
    const rows = await getRows<Record<string, unknown>>(SHEET_NAMES.PolicyPayouts)
    return rows.map(parsePolicyPayout)
  },
  ["policy_payouts"],
  { tags: [TAGS.policyPayouts] }
)

const getSettingsRaw = cache(
  async (): Promise<Setting[]> => getRows<Setting>(SHEET_NAMES.Settings),
  ["settings"],
  { tags: [TAGS.settings] }
)

/** Display names for AddedBy, falling back to "User 1"/"User 2" until customized. */
export async function getAddedByNames(): Promise<Record<AddedBy, string>> {
  const rows = await getSettingsRaw()
  const byKey = new Map(rows.map((r) => [r.Key, r.Value]))
  return {
    User1: byKey.get(SETTING_KEYS.User1Name) || DEFAULT_ADDED_BY_NAMES.User1,
    User2: byKey.get(SETTING_KEYS.User2Name) || DEFAULT_ADDED_BY_NAMES.User2,
  }
}

export async function updateAddedByNames(names: Record<AddedBy, string>): Promise<void> {
  await upsertRow(SHEET_NAMES.Settings, "Key", SETTING_KEYS.User1Name, {
    Value: names.User1,
  })
  await upsertRow(SHEET_NAMES.Settings, "Key", SETTING_KEYS.User2Name, {
    Value: names.User2,
  })
  updateTag(TAGS.settings)
}

export async function addCategory(
  input: Omit<Category, "CategoryID">
): Promise<Category> {
  const category: Category = { ...input, CategoryID: uuid() }
  await appendRow(SHEET_NAMES.Categories, category)
  updateTag(TAGS.categories)
  return category
}

export async function updateCategory(
  categoryId: string,
  input: Omit<Category, "CategoryID">
): Promise<void> {
  await updateRow(SHEET_NAMES.Categories, "CategoryID", categoryId, input)
  updateTag(TAGS.categories)
}

function inUseError(count: number): Error {
  return new Error(`Can't delete — used by ${count} transaction${count === 1 ? "" : "s"}`)
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const transactions = await getTransactions()
  const inUse = transactions.filter((t) => t.CategoryID === categoryId).length
  if (inUse > 0) throw inUseError(inUse)

  await deleteRow(SHEET_NAMES.Categories, "CategoryID", categoryId)
  updateTag(TAGS.categories)
}

export async function addPaymentMode(
  input: Omit<PaymentMode, "PaymentModeID">
): Promise<PaymentMode> {
  const normalized = toPaymentModeWrite(input)
  const paymentMode: PaymentMode = { ...normalized, PaymentModeID: uuid() }
  await appendRow(SHEET_NAMES.PaymentModes, paymentMode)
  updateTag(TAGS.paymentModes)
  return paymentMode
}

export async function updatePaymentMode(
  paymentModeId: string,
  input: Omit<PaymentMode, "PaymentModeID">
): Promise<void> {
  await updateRow(SHEET_NAMES.PaymentModes, "PaymentModeID", paymentModeId, toPaymentModeWrite(input))
  updateTag(TAGS.paymentModes)
}

export async function deletePaymentMode(paymentModeId: string): Promise<void> {
  const transactions = await getTransactions()
  const inUse = transactions.filter((t) => t.PaymentModeID === paymentModeId).length
  if (inUse > 0) throw inUseError(inUse)

  await deleteRow(SHEET_NAMES.PaymentModes, "PaymentModeID", paymentModeId)
  updateTag(TAGS.paymentModes)
}

export async function addEvent(input: Omit<Event, "EventID">): Promise<Event> {
  const event: Event = { ...input, EventID: uuid() }
  await appendRow(SHEET_NAMES.Events, event)
  updateTag(TAGS.events)
  return event
}

export async function updateEvent(
  eventId: string,
  input: Omit<Event, "EventID">
): Promise<void> {
  await updateRow(SHEET_NAMES.Events, "EventID", eventId, input)
  updateTag(TAGS.events)
}

export async function deleteEvent(eventId: string): Promise<void> {
  const transactions = await getTransactions()
  const inUse = transactions.filter((t) => t.EventID === eventId).length
  if (inUse > 0) throw inUseError(inUse)

  await deleteRow(SHEET_NAMES.Events, "EventID", eventId)
  updateTag(TAGS.events)
}

export async function addTransaction(
  input: Omit<Transaction, "TxID">
): Promise<Transaction> {
  const transaction: Transaction = { ...input, TxID: uuid() }
  await appendRow(SHEET_NAMES.Transactions, transaction)
  updateTag(TAGS.transactions)
  return transaction
}

export async function updateTransaction(
  txId: string,
  input: Omit<Transaction, "TxID">
): Promise<void> {
  await updateRow(SHEET_NAMES.Transactions, "TxID", txId, input)
  updateTag(TAGS.transactions)
}

export async function deleteTransaction(txId: string): Promise<void> {
  await deleteRow(SHEET_NAMES.Transactions, "TxID", txId)
  updateTag(TAGS.transactions)
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

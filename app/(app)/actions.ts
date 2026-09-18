"use server"

import {
  addCategory,
  addEvent,
  addPaymentMode,
  addSandboxPlan,
  addTransaction,
  deleteCategory,
  deleteEvent,
  deletePaymentMode,
  deleteTransaction,
  updateAddedByNames,
  updateCategory,
  updateEvent,
  updatePaymentMode,
  updateTransaction,
} from "@/lib/data"
import {
  categorySchema,
  eventSchema,
  householdSettingsSchema,
  paymentModeSchema,
  sandboxPlanSchema,
  transactionSchema,
} from "@/lib/validation"
import type { Category, Event, PaymentMode, SandboxPlan } from "@/lib/types"

export type ActionState = { error?: string }

async function toActionState(action: () => Promise<void>): Promise<ActionState> {
  try {
    await action()
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong" }
  }
}

export type CategoryActionState = { error?: string; category?: Category }

function parseCategoryFormData(formData: FormData) {
  return categorySchema.safeParse({
    Name: formData.get("Name"),
    Type: formData.get("Type"),
    Icon: formData.get("Icon"),
    ColorHex: formData.get("ColorHex"),
  })
}

export async function createCategoryAction(
  formData: FormData
): Promise<CategoryActionState> {
  const parsed = parseCategoryFormData(formData)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category" }
  }

  const category = await addCategory(parsed.data)
  return { category }
}

export async function updateCategoryAction(
  categoryId: string,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseCategoryFormData(formData)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category" }
  }

  await updateCategory(categoryId, parsed.data)
  return {}
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionState> {
  return toActionState(() => deleteCategory(categoryId))
}

export type PaymentModeActionState = { error?: string; paymentMode?: PaymentMode }

export async function createPaymentModeAction(
  formData: FormData
): Promise<PaymentModeActionState> {
  const parsed = paymentModeSchema.safeParse({
    Name: formData.get("Name"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment mode" }
  }

  const paymentMode = await addPaymentMode(parsed.data)
  return { paymentMode }
}

export async function updatePaymentModeAction(
  paymentModeId: string,
  formData: FormData
): Promise<ActionState> {
  const parsed = paymentModeSchema.safeParse({
    Name: formData.get("Name"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment mode" }
  }

  await updatePaymentMode(paymentModeId, parsed.data)
  return {}
}

export async function deletePaymentModeAction(paymentModeId: string): Promise<ActionState> {
  return toActionState(() => deletePaymentMode(paymentModeId))
}

export type EventActionState = { error?: string; event?: Event }

export async function createEventAction(formData: FormData): Promise<EventActionState> {
  const parsed = eventSchema.safeParse({
    Name: formData.get("Name"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event" }
  }

  const event = await addEvent(parsed.data)
  return { event }
}

export async function updateEventAction(
  eventId: string,
  formData: FormData
): Promise<ActionState> {
  const parsed = eventSchema.safeParse({
    Name: formData.get("Name"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event" }
  }

  await updateEvent(eventId, parsed.data)
  return {}
}

export async function deleteEventAction(eventId: string): Promise<ActionState> {
  return toActionState(() => deleteEvent(eventId))
}

export async function updateHouseholdSettingsAction(
  formData: FormData
): Promise<ActionState> {
  const parsed = householdSettingsSchema.safeParse({
    User1Name: formData.get("User1Name"),
    User2Name: formData.get("User2Name"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid names" }
  }

  await updateAddedByNames({
    User1: parsed.data.User1Name,
    User2: parsed.data.User2Name,
  })
  return {}
}

export type CreateTransactionInput = {
  Amount: number
  CategoryID: string
  Date: string
  Note: string
  IsRecurring: boolean
  AddedBy: "User1" | "User2"
  PaymentModeID: string
  EventID: string
}

function resolveEvent(
  eventId: string,
  event: Pick<Event, "EventID" | "Name"> | null | undefined
): { error?: string; EventID: string; EventName: string } {
  if (!eventId) return { EventID: "", EventName: "" }
  if (!event || event.EventID !== eventId) {
    return { error: "Event mismatch", EventID: "", EventName: "" }
  }
  return { EventID: event.EventID, EventName: event.Name }
}

export async function createTransactionAction(
  input: CreateTransactionInput,
  category: Pick<Category, "CategoryID" | "Name" | "Type">,
  paymentMode: Pick<PaymentMode, "PaymentModeID" | "Name">,
  event?: Pick<Event, "EventID" | "Name"> | null
): Promise<ActionState> {
  const parsed = transactionSchema.safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid transaction" }
  }

  if (category.CategoryID !== parsed.data.CategoryID) {
    return { error: "Category mismatch" }
  }

  if (paymentMode.PaymentModeID !== parsed.data.PaymentModeID) {
    return { error: "Payment mode mismatch" }
  }

  const resolvedEvent = resolveEvent(parsed.data.EventID, event)
  if (resolvedEvent.error) {
    return { error: resolvedEvent.error }
  }

  await addTransaction({
    Date: parsed.data.Date,
    Amount: parsed.data.Amount,
    Type: category.Type === "Income" ? "Income" : "Expense",
    CategoryID: parsed.data.CategoryID,
    CategoryName: category.Name,
    AddedBy: parsed.data.AddedBy,
    Note: parsed.data.Note,
    IsRecurring: parsed.data.IsRecurring,
    PaymentModeID: parsed.data.PaymentModeID,
    PaymentModeName: paymentMode.Name,
    EventID: resolvedEvent.EventID,
    EventName: resolvedEvent.EventName,
  })

  return {}
}

export async function updateTransactionAction(
  txId: string,
  input: CreateTransactionInput,
  category: Pick<Category, "CategoryID" | "Name" | "Type">,
  paymentMode: Pick<PaymentMode, "PaymentModeID" | "Name">,
  event?: Pick<Event, "EventID" | "Name"> | null
): Promise<ActionState> {
  const parsed = transactionSchema.safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid transaction" }
  }

  if (category.CategoryID !== parsed.data.CategoryID) {
    return { error: "Category mismatch" }
  }

  if (paymentMode.PaymentModeID !== parsed.data.PaymentModeID) {
    return { error: "Payment mode mismatch" }
  }

  const resolvedEvent = resolveEvent(parsed.data.EventID, event)
  if (resolvedEvent.error) {
    return { error: resolvedEvent.error }
  }

  await updateTransaction(txId, {
    Date: parsed.data.Date,
    Amount: parsed.data.Amount,
    Type: category.Type === "Income" ? "Income" : "Expense",
    CategoryID: parsed.data.CategoryID,
    CategoryName: category.Name,
    AddedBy: parsed.data.AddedBy,
    Note: parsed.data.Note,
    IsRecurring: parsed.data.IsRecurring,
    PaymentModeID: parsed.data.PaymentModeID,
    PaymentModeName: paymentMode.Name,
    EventID: resolvedEvent.EventID,
    EventName: resolvedEvent.EventName,
  })

  return {}
}

export async function deleteTransactionAction(txId: string): Promise<ActionState> {
  return toActionState(() => deleteTransaction(txId))
}

export type SandboxPlanActionState = { error?: string; plan?: SandboxPlan }

export async function createSandboxPlanAction(
  formData: FormData
): Promise<SandboxPlanActionState> {
  const parsed = sandboxPlanSchema.safeParse({
    PlanName: formData.get("PlanName"),
    TargetAmount: formData.get("TargetAmount"),
    CurrentSaved: formData.get("CurrentSaved"),
    TargetDate: formData.get("TargetDate"),
    EstimatedMonthlyImpact: formData.get("EstimatedMonthlyImpact"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid plan" }
  }

  const plan = await addSandboxPlan(parsed.data)
  return { plan }
}

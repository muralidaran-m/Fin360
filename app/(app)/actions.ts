"use server"

import {
  addCategory,
  addPaymentMode,
  addTransaction,
  updateAddedByNames,
  updateCategory,
  updatePaymentMode,
} from "@/lib/data"
import {
  categorySchema,
  householdSettingsSchema,
  paymentModeSchema,
  transactionSchema,
} from "@/lib/validation"
import type { Category, PaymentMode } from "@/lib/types"

export type ActionState = { error?: string }

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
}

export async function createTransactionAction(
  input: CreateTransactionInput,
  category: Pick<Category, "CategoryID" | "Name" | "Type">,
  paymentMode: Pick<PaymentMode, "PaymentModeID" | "Name">
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
  })

  return {}
}

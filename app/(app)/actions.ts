"use server"

import { addCategory, addPaymentMode, addTransaction } from "@/lib/data"
import { categorySchema, paymentModeSchema, transactionSchema } from "@/lib/validation"
import type { Category, PaymentMode } from "@/lib/types"

export type ActionState = { error?: string }

export type CategoryActionState = { error?: string; category?: Category }

export async function createCategoryAction(
  formData: FormData
): Promise<CategoryActionState> {
  const parsed = categorySchema.safeParse({
    Name: formData.get("Name"),
    Type: formData.get("Type"),
    Icon: formData.get("Icon"),
    ColorHex: formData.get("ColorHex"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category" }
  }

  const category = await addCategory(parsed.data)
  return { category }
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

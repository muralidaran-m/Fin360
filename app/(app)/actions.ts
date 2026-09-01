"use server"

import { addCategory, addTransaction } from "@/lib/data"
import { categorySchema, transactionSchema } from "@/lib/validation"
import type { Category } from "@/lib/types"

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

export type CreateTransactionInput = {
  Amount: number
  CategoryID: string
  Date: string
  Note: string
  IsRecurring: boolean
  AddedBy: "User1" | "User2"
}

export async function createTransactionAction(
  input: CreateTransactionInput,
  category: Pick<Category, "CategoryID" | "Name" | "Type">
): Promise<ActionState> {
  const parsed = transactionSchema.safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid transaction" }
  }

  if (category.CategoryID !== parsed.data.CategoryID) {
    return { error: "Category mismatch" }
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
  })

  return {}
}

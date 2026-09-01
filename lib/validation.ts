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

export const transactionSchema = z.object({
  Amount: z.coerce
    .number({ invalid_type_error: "Amount is required" })
    .positive("Amount must be greater than 0"),
  CategoryID: z.string().min(1, "Category is required"),
  Date: z.string().min(1, "Date is required"),
  Note: z.string().trim().max(200),
  IsRecurring: z.boolean(),
  AddedBy: z.enum(["User1", "User2"]),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>

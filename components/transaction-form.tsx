"use client"

import { useEffect, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createTransactionAction, updateTransactionAction } from "@/app/(app)/actions"
import { CategoryCombobox } from "@/components/category-combobox"
import { PaymentModeCombobox } from "@/components/payment-mode-combobox"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { AddedBy, Category, PaymentMode, Transaction } from "@/lib/types"
import { transactionSchema, type TransactionFormValues } from "@/lib/validation"

const ADDED_BY_STORAGE_KEY = "fin360:addedBy"
const ADDED_BY_VALUES: AddedBy[] = ["User1", "User2"]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TransactionForm({
  transaction,
  categories,
  paymentModes,
  addedByNames,
  onCategoryCreated,
  onPaymentModeCreated,
  onSuccess,
}: {
  transaction?: Transaction
  categories: Category[]
  paymentModes: PaymentMode[]
  addedByNames: Record<AddedBy, string>
  onCategoryCreated: (category: Category) => void
  onPaymentModeCreated: (paymentMode: PaymentMode) => void
  onSuccess: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const isEditing = Boolean(transaction)

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          Amount: transaction.Amount,
          CategoryID: transaction.CategoryID,
          Date: transaction.Date,
          Note: transaction.Note,
          IsRecurring: transaction.IsRecurring,
          AddedBy: transaction.AddedBy,
          PaymentModeID: transaction.PaymentModeID,
        }
      : {
          Amount: 0,
          CategoryID: "",
          Date: today(),
          Note: "",
          IsRecurring: false,
          AddedBy: "User1",
          PaymentModeID: "",
        },
  })

  useEffect(() => {
    if (isEditing) return
    const stored = window.localStorage.getItem(ADDED_BY_STORAGE_KEY)
    if (stored === "User1" || stored === "User2") {
      form.setValue("AddedBy", stored)
    }
  }, [form, isEditing])

  function onSubmit(values: TransactionFormValues) {
    const category = categories.find((c) => c.CategoryID === values.CategoryID)
    if (!category) {
      form.setError("CategoryID", { message: "Select a category" })
      return
    }

    const paymentMode = paymentModes.find((p) => p.PaymentModeID === values.PaymentModeID)
    if (!paymentMode) {
      form.setError("PaymentModeID", { message: "Select a payment mode" })
      return
    }

    startTransition(async () => {
      const result = transaction
        ? await updateTransactionAction(transaction.TxID, values, category, paymentMode)
        : await createTransactionAction(values, category, paymentMode)
      if (result.error) {
        form.setError("root", { message: result.error })
        return
      }

      if (transaction) {
        toast.success(`Updated ${category.Name} — ₹${values.Amount}`)
      } else {
        window.localStorage.setItem(ADDED_BY_STORAGE_KEY, values.AddedBy)
        toast.success(`Added ${category.Name} — ₹${values.Amount}`)
        form.reset({
          Amount: 0,
          CategoryID: "",
          Date: today(),
          Note: "",
          IsRecurring: false,
          AddedBy: values.AddedBy,
          PaymentModeID: "",
        })
      }
      router.refresh()
      onSuccess()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="Amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  autoFocus
                  {...field}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? NaN : e.target.valueAsNumber
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="CategoryID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <CategoryCombobox
                  categories={categories}
                  value={field.value}
                  onChange={field.onChange}
                  onCategoryCreated={onCategoryCreated}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="PaymentModeID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment mode</FormLabel>
              <FormControl>
                <PaymentModeCombobox
                  paymentModes={paymentModes}
                  value={field.value}
                  onChange={field.onChange}
                  onPaymentModeCreated={onPaymentModeCreated}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Weekly groceries" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="IsRecurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel className="cursor-pointer">Recurring expense</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="AddedBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Added by</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {ADDED_BY_VALUES.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={field.value === value ? "default" : "outline"}
                    onClick={() => field.onChange(value)}
                  >
                    {addedByNames[value]}
                  </Button>
                ))}
              </div>
            </FormItem>
          )}
        />

        {form.formState.errors.root ? (
          <p className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? isEditing
              ? "Saving..."
              : "Adding..."
            : isEditing
              ? "Save changes"
              : "Add transaction"}
        </Button>
      </form>
    </Form>
  )
}

"use client"

import { useEffect, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createTransactionAction } from "@/app/(app)/actions"
import { CategoryCombobox } from "@/components/category-combobox"
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
import type { AddedBy, Category } from "@/lib/types"
import { transactionSchema, type TransactionFormValues } from "@/lib/validation"

const ADDED_BY_STORAGE_KEY = "fin360:addedBy"
const ADDED_BY_OPTIONS: { value: AddedBy; label: string }[] = [
  { value: "User1", label: "User 1" },
  { value: "User2", label: "User 2" },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TransactionForm({
  categories,
  onCategoryCreated,
  onSuccess,
}: {
  categories: Category[]
  onCategoryCreated: (category: Category) => void
  onSuccess: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      Amount: 0,
      CategoryID: "",
      Date: today(),
      Note: "",
      IsRecurring: false,
      AddedBy: "User1",
    },
  })

  useEffect(() => {
    const stored = window.localStorage.getItem(ADDED_BY_STORAGE_KEY)
    if (stored === "User1" || stored === "User2") {
      form.setValue("AddedBy", stored)
    }
  }, [form])

  function onSubmit(values: TransactionFormValues) {
    const category = categories.find((c) => c.CategoryID === values.CategoryID)
    if (!category) {
      form.setError("CategoryID", { message: "Select a category" })
      return
    }

    startTransition(async () => {
      const result = await createTransactionAction(values, category)
      if (result.error) {
        form.setError("root", { message: result.error })
        return
      }

      window.localStorage.setItem(ADDED_BY_STORAGE_KEY, values.AddedBy)
      toast.success(`Added ${category.Name} — ₹${values.Amount}`)
      form.reset({
        Amount: 0,
        CategoryID: "",
        Date: today(),
        Note: "",
        IsRecurring: false,
        AddedBy: values.AddedBy,
      })
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
                {ADDED_BY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={field.value === option.value ? "default" : "outline"}
                    onClick={() => field.onChange(option.value)}
                  >
                    {option.label}
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
          {pending ? "Adding..." : "Add transaction"}
        </Button>
      </form>
    </Form>
  )
}

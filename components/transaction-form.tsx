"use client"

import { useEffect, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { createTransactionAction, updateTransactionAction } from "@/app/(app)/actions"
import { CategoryCombobox } from "@/components/category-combobox"
import { EventCombobox } from "@/components/event-combobox"
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
import { computeBillDate } from "@/lib/credit-card"
import type { AddedBy, Category, Event, PaymentMode, Transaction } from "@/lib/types"
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
  events,
  addedByNames,
  onCategoryCreated,
  onPaymentModeCreated,
  onEventCreated,
  onSuccess,
}: {
  transaction?: Transaction
  categories: Category[]
  paymentModes: PaymentMode[]
  events: Event[]
  addedByNames: Record<AddedBy, string>
  onCategoryCreated: (category: Category) => void
  onPaymentModeCreated: (paymentMode: PaymentMode) => void
  onEventCreated: (event: Event) => void
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
          EventID: transaction.EventID,
          BillDate: transaction.BillDate,
        }
      : {
          Amount: 0,
          CategoryID: "",
          Date: today(),
          Note: "",
          IsRecurring: false,
          AddedBy: "User1",
          PaymentModeID: "",
          EventID: "",
          BillDate: "",
        },
  })

  const paymentModeId = useWatch({ control: form.control, name: "PaymentModeID" })
  const date = useWatch({ control: form.control, name: "Date" })
  const selectedPaymentMode = paymentModes.find((p) => p.PaymentModeID === paymentModeId)

  useEffect(() => {
    if (selectedPaymentMode?.Kind === "CreditCard" && selectedPaymentMode.StatementDay && selectedPaymentMode.DueDays) {
      form.setValue("BillDate", computeBillDate(date, selectedPaymentMode))
    } else {
      form.setValue("BillDate", "")
    }
    // Deliberately excludes selectedPaymentMode/form and BillDate's own value:
    // re-suggest only when the purchase date or the payment mode changes, so a
    // manual edit to BillDate itself isn't clobbered on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentModeId, date])

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

    const event = values.EventID
      ? events.find((e) => e.EventID === values.EventID)
      : undefined
    if (values.EventID && !event) {
      form.setError("EventID", { message: "Select an event" })
      return
    }

    startTransition(async () => {
      const result = transaction
        ? await updateTransactionAction(transaction.TxID, values, category, paymentMode, event)
        : await createTransactionAction(values, category, paymentMode, event)
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
          EventID: "",
          BillDate: "",
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
          name="EventID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event (optional)</FormLabel>
              <FormControl>
                <EventCombobox
                  events={events}
                  value={field.value}
                  onChange={field.onChange}
                  onEventCreated={onEventCreated}
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

        {selectedPaymentMode?.Kind === "CreditCard" ? (
          <FormField
            control={form.control}
            name="BillDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bill date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <p className="text-muted-foreground text-xs">
                  Auto-suggested from this card&apos;s billing cycle — counts toward
                  that month&apos;s totals instead of the purchase month. Edit if
                  needed.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

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

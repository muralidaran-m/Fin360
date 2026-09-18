"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"

import { createPaymentModeAction, updatePaymentModeAction } from "@/app/(app)/actions"
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
import type { PaymentMode, PaymentModeKind } from "@/lib/types"
import {
  PAYMENT_MODE_KINDS,
  paymentModeSchema,
  type PaymentModeFormValues,
} from "@/lib/validation"

const KIND_LABELS: Record<PaymentModeKind, string> = {
  Ordinary: "Cash / Bank / UPI",
  CreditCard: "Credit Card",
}

export function PaymentModeForm({
  paymentMode,
  onSuccess,
}: {
  paymentMode?: PaymentMode
  onSuccess: (paymentMode: PaymentMode) => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<PaymentModeFormValues>({
    resolver: zodResolver(paymentModeSchema),
    defaultValues: {
      Name: paymentMode?.Name ?? "",
      Kind: paymentMode?.Kind ?? "Ordinary",
      StatementDay: paymentMode?.StatementDay ?? 0,
      DueDays: paymentMode?.DueDays ?? 0,
    },
  })

  const kind = useWatch({ control: form.control, name: "Kind" })

  function onSubmit(values: PaymentModeFormValues) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("Name", values.Name)
      formData.set("Kind", values.Kind)
      formData.set("StatementDay", String(values.StatementDay))
      formData.set("DueDays", String(values.DueDays))

      if (paymentMode) {
        const result = await updatePaymentModeAction(paymentMode.PaymentModeID, formData)
        if (result.error) {
          form.setError("root", { message: result.error })
          return
        }
        onSuccess({ ...values, PaymentModeID: paymentMode.PaymentModeID })
        return
      }

      const result = await createPaymentModeAction(formData)
      if (result.error || !result.paymentMode) {
        form.setError("root", { message: result.error ?? "Something went wrong" })
        return
      }
      form.reset()
      onSuccess(result.paymentMode)
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // Stop propagation: this form can be nested (via a Dialog portal)
          // inside another form's React tree, and React re-dispatches
          // bubbling events along that tree regardless of DOM portal
          // boundaries — without this, submitting here also fires the
          // ancestor form's onSubmit and its validation.
          e.stopPropagation()
          form.handleSubmit(onSubmit)(e)
        }}
        className="grid gap-4"
      >
        <FormField
          control={form.control}
          name="Name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. UPI" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_MODE_KINDS.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={field.value === value ? "default" : "outline"}
                    onClick={() => field.onChange(value)}
                  >
                    {KIND_LABELS[value]}
                  </Button>
                ))}
              </div>
            </FormItem>
          )}
        />

        {kind === "CreditCard" ? (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="StatementDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statement day</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="31"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="DueDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due (days after statement)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="60"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? 0 : e.target.valueAsNumber)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : null}

        {form.formState.errors.root ? (
          <p className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending
            ? paymentMode
              ? "Saving..."
              : "Adding..."
            : paymentMode
              ? "Save changes"
              : "Add payment mode"}
        </Button>
      </form>
    </Form>
  )
}

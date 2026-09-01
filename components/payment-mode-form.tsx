"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { createPaymentModeAction } from "@/app/(app)/actions"
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
import type { PaymentMode } from "@/lib/types"
import { paymentModeSchema, type PaymentModeFormValues } from "@/lib/validation"

export function PaymentModeForm({
  onSuccess,
}: {
  onSuccess: (paymentMode: PaymentMode) => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<PaymentModeFormValues>({
    resolver: zodResolver(paymentModeSchema),
    defaultValues: { Name: "" },
  })

  function onSubmit(values: PaymentModeFormValues) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("Name", values.Name)

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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

        {form.formState.errors.root ? (
          <p className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add payment mode"}
        </Button>
      </form>
    </Form>
  )
}

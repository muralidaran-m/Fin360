"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm } from "react-hook-form"

import { createSandboxPlanAction } from "@/app/(app)/actions"
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
import type { SandboxPlan } from "@/lib/types"
import { sandboxPlanSchema, type SandboxPlanFormValues } from "@/lib/validation"

export function SandboxPlanForm({
  onSuccess,
}: {
  onSuccess: (plan: SandboxPlan) => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<SandboxPlanFormValues>({
    resolver: zodResolver(sandboxPlanSchema),
    defaultValues: {
      PlanName: "",
      TargetAmount: 0,
      CurrentSaved: 0,
      TargetDate: "",
      EstimatedMonthlyImpact: 0,
    },
  })

  function onSubmit(values: SandboxPlanFormValues) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("PlanName", values.PlanName)
      formData.set("TargetAmount", String(values.TargetAmount))
      formData.set("CurrentSaved", String(values.CurrentSaved))
      formData.set("TargetDate", values.TargetDate)
      formData.set(
        "EstimatedMonthlyImpact",
        String(values.EstimatedMonthlyImpact)
      )

      const result = await createSandboxPlanAction(formData)
      if (result.error || !result.plan) {
        form.setError("root", { message: result.error ?? "Something went wrong" })
        return
      }
      form.reset()
      onSuccess(result.plan)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="PlanName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan name</FormLabel>
              <FormControl>
                <Input placeholder="Emergency fund" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="TargetAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
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
          name="CurrentSaved"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Already saved</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
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
          name="TargetDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="EstimatedMonthlyImpact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated monthly contribution</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
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

        {form.formState.errors.root ? (
          <p className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add plan"}
        </Button>
      </form>
    </Form>
  )
}

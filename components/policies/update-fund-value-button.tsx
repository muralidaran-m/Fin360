"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { updatePolicyFundValueAction } from "@/app/(app)/actions"
import { formatRupees } from "@/components/policies/chart-tooltip"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toISODate } from "@/lib/policy"
import type { Policy } from "@/lib/types"
import { fundValueSchema, type FundValueFormValues } from "@/lib/validation"

function FundValueForm({ policy, onSuccess }: { policy: Policy; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition()
  const form = useForm<FundValueFormValues>({
    resolver: zodResolver(fundValueSchema),
    defaultValues: {
      FundUnits: policy.FundUnits ?? undefined,
      FundNav: policy.FundNav ?? undefined,
      FundValueDate: toISODate(new Date()),
    },
  })

  const units = Number(useWatch({ control: form.control, name: "FundUnits" }))
  const nav = Number(useWatch({ control: form.control, name: "FundNav" }))
  const preview = units > 0 && nav > 0 ? units * nav : null

  function onSubmit(values: FundValueFormValues) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("FundUnits", String(values.FundUnits))
      formData.set("FundNav", String(values.FundNav))
      formData.set("FundValueDate", values.FundValueDate)
      const result = await updatePolicyFundValueAction(policy.PolicyID, formData)
      if (result.error) {
        form.setError("root", { message: result.error })
        return
      }
      onSuccess()
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.stopPropagation()
          form.handleSubmit(onSubmit)(e)
        }}
        className="grid gap-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="FundUnits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Units</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    placeholder="e.g. 1250.75"
                    autoFocus
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="FundNav"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NAV (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    placeholder="e.g. 12.34"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="FundValueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NAV date</FormLabel>
              <FormControl>
                <Input type="date" max={toISODate(new Date())} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-muted-foreground text-sm">
          Fund value:{" "}
          <span className="text-foreground font-semibold">
            {preview === null ? "—" : formatRupees(preview)}
          </span>
        </p>

        {form.formState.errors.root ? (
          <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save fund value"}
        </Button>
      </form>
    </Form>
  )
}

export function UpdateFundValueButton({ policy }: { policy: Policy }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <RefreshCw data-icon="inline-start" />
        Update fund value
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update fund value</DialogTitle>
            <DialogDescription>
              {policy.PlanName}: enter the units and NAV from your latest statement or the
              insurer&apos;s app. Units change on each premium due date.
            </DialogDescription>
          </DialogHeader>
          <FundValueForm
            policy={policy}
            onSuccess={() => {
              setOpen(false)
              toast.success(`Updated fund value for ${policy.PlanName}`)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

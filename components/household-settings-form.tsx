"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { updateHouseholdSettingsAction } from "@/app/(app)/actions"
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
import type { AddedBy } from "@/lib/types"
import {
  householdSettingsSchema,
  type HouseholdSettingsFormValues,
} from "@/lib/validation"

export function HouseholdSettingsForm({
  names,
}: {
  names: Record<AddedBy, string>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<HouseholdSettingsFormValues>({
    resolver: zodResolver(householdSettingsSchema),
    defaultValues: { User1Name: names.User1, User2Name: names.User2 },
  })

  function onSubmit(values: HouseholdSettingsFormValues) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("User1Name", values.User1Name)
      formData.set("User2Name", values.User2Name)

      const result = await updateHouseholdSettingsAction(formData)
      if (result.error) {
        form.setError("root", { message: result.error })
        return
      }
      toast.success("Household names updated")
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="User1Name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User 1</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="User2Name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User 2</FormLabel>
              <FormControl>
                <Input {...field} />
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

        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  )
}

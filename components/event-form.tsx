"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { createEventAction, updateEventAction } from "@/app/(app)/actions"
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
import type { Event } from "@/lib/types"
import { eventSchema, type EventFormValues } from "@/lib/validation"

export function EventForm({
  event,
  onSuccess,
}: {
  event?: Event
  onSuccess: (event: Event) => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { Name: event?.Name ?? "" },
  })

  function onSubmit(values: EventFormValues) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("Name", values.Name)

      if (event) {
        const result = await updateEventAction(event.EventID, formData)
        if (result.error) {
          form.setError("root", { message: result.error })
          return
        }
        onSuccess({ ...values, EventID: event.EventID })
        return
      }

      const result = await createEventAction(formData)
      if (result.error || !result.event) {
        form.setError("root", { message: result.error ?? "Something went wrong" })
        return
      }
      form.reset()
      onSuccess(result.event)
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
                <Input placeholder="e.g. Goa Trip" autoFocus {...field} />
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
          {pending
            ? event
              ? "Saving..."
              : "Adding..."
            : event
              ? "Save changes"
              : "Add event"}
        </Button>
      </form>
    </Form>
  )
}

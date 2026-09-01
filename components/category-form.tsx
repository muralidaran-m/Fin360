"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { createCategoryAction, updateCategoryAction } from "@/app/(app)/actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORY_ICON_NAMES, getCategoryIcon } from "@/lib/icons"
import type { Category, CategoryType } from "@/lib/types"
import { categorySchema, type CategoryFormValues } from "@/lib/validation"

const CATEGORY_TYPES: CategoryType[] = ["Need", "Want", "Income", "Savings"]

const DEFAULT_COLOR = "#6366f1"

export function CategoryForm({
  category,
  onSuccess,
}: {
  category?: Category
  onSuccess: (category: Category) => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      Name: category?.Name ?? "",
      Type: category?.Type ?? "Want",
      Icon: category?.Icon ?? CATEGORY_ICON_NAMES[0],
      ColorHex: category?.ColorHex ?? DEFAULT_COLOR,
    },
  })

  function onSubmit(values: CategoryFormValues) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("Name", values.Name)
      formData.set("Type", values.Type)
      formData.set("Icon", values.Icon)
      formData.set("ColorHex", values.ColorHex)

      if (category) {
        const result = await updateCategoryAction(category.CategoryID, formData)
        if (result.error) {
          form.setError("root", { message: result.error })
          return
        }
        onSuccess({ ...values, CategoryID: category.CategoryID })
        return
      }

      const result = await createCategoryAction(formData)
      if (result.error || !result.category) {
        form.setError("root", { message: result.error ?? "Something went wrong" })
        return
      }
      form.reset()
      onSuccess(result.category)
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
                <Input placeholder="Groceries" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="Icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORY_ICON_NAMES.map((name) => {
                    const Icon = getCategoryIcon(name)
                    return (
                      <SelectItem key={name} value={name}>
                        <Icon className="size-4" />
                        {name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ColorHex"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <input
                    type="color"
                    className="h-9 w-12 rounded-md border border-input"
                    {...field}
                  />
                </FormControl>
                <Input
                  value={field.value}
                  onChange={field.onChange}
                  className="font-mono"
                />
              </div>
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
            ? category
              ? "Saving..."
              : "Adding..."
            : category
              ? "Save changes"
              : "Add category"}
        </Button>
      </form>
    </Form>
  )
}

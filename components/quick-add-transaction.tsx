"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { TransactionForm } from "@/components/transaction-form"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Category } from "@/lib/types"

export function QuickAddTransaction({
  categories: initialCategories,
}: {
  categories: Category[]
}) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState(initialCategories)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed right-4 bottom-4 z-40 size-14 rounded-full shadow-lg"
        aria-label="Add transaction"
      >
        <Plus className="size-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[90vh] max-w-lg rounded-t-xl"
        >
          <SheetHeader>
            <SheetTitle>Add transaction</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <TransactionForm
              categories={categories}
              onCategoryCreated={(category) =>
                setCategories((prev) => [...prev, category])
              }
              onSuccess={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

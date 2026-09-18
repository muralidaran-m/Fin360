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
import type { AddedBy, Category, Event, PaymentMode } from "@/lib/types"

export function QuickAddTransaction({
  categories: initialCategories,
  paymentModes: initialPaymentModes,
  events: initialEvents,
  addedByNames,
}: {
  categories: Category[]
  paymentModes: PaymentMode[]
  events: Event[]
  addedByNames: Record<AddedBy, string>
}) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState(initialCategories)
  const [paymentModes, setPaymentModes] = useState(initialPaymentModes)
  const [events, setEvents] = useState(initialEvents)

  // AppLayout doesn't remount on navigation, so when Settings triggers a
  // router.refresh(), these props change without this component ever
  // remounting. Adjust the local (optimistic-append) copies during render
  // rather than in an effect, per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevInitialCategories, setPrevInitialCategories] = useState(initialCategories)
  if (initialCategories !== prevInitialCategories) {
    setPrevInitialCategories(initialCategories)
    setCategories(initialCategories)
  }

  const [prevInitialPaymentModes, setPrevInitialPaymentModes] =
    useState(initialPaymentModes)
  if (initialPaymentModes !== prevInitialPaymentModes) {
    setPrevInitialPaymentModes(initialPaymentModes)
    setPaymentModes(initialPaymentModes)
  }

  const [prevInitialEvents, setPrevInitialEvents] = useState(initialEvents)
  if (initialEvents !== prevInitialEvents) {
    setPrevInitialEvents(initialEvents)
    setEvents(initialEvents)
  }

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
              paymentModes={paymentModes}
              events={events}
              addedByNames={addedByNames}
              onCategoryCreated={(category) =>
                setCategories((prev) => [...prev, category])
              }
              onPaymentModeCreated={(paymentMode) =>
                setPaymentModes((prev) => [...prev, paymentMode])
              }
              onEventCreated={(event) => setEvents((prev) => [...prev, event])}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

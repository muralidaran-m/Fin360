"use client"

import { useState } from "react"

import { TransactionList } from "@/components/transactions/transaction-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { AddedBy, Category, Event, PaymentMode, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

export function RecurringExpenseCard({
  amount,
  previousAmount,
  transactions,
  categoriesById,
  categories,
  paymentModes,
  events,
  addedByNames,
}: {
  amount: number
  previousAmount: number
  transactions: Transaction[]
  categoriesById: Map<string, Category>
  categories: Category[]
  paymentModes: PaymentMode[]
  events: Event[]
  addedByNames: Record<AddedBy, string>
}) {
  const [open, setOpen] = useState(false)
  const delta = previousAmount > 0 ? (amount - previousAmount) / previousAmount : null

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          Total Recurring Expense
          <span className="ml-1">· This month</span>
        </CardTitle>
        {transactions.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            View list
          </button>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold">₹{amount.toFixed(2)}</span>
          {delta !== null ? (
            <span
              className={cn(
                "text-xs font-medium",
                delta > 0 ? "text-status-critical" : "text-status-good"
              )}
            >
              {delta > 0 ? "+" : ""}
              {(delta * 100).toFixed(0)}% vs last month
            </span>
          ) : null}
        </div>
      </CardContent>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[90vh] max-w-lg rounded-t-xl"
        >
          <SheetHeader>
            <SheetTitle>Recurring expenses · This month</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <TransactionList
              transactions={transactions}
              categoriesById={categoriesById}
              categories={categories}
              paymentModes={paymentModes}
              events={events}
              addedByNames={addedByNames}
              emptyMessage="No recurring expenses this month."
            />
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}

"use client"

import { useState } from "react"

import { TransactionForm } from "@/components/transaction-form"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CategoryIcon } from "@/lib/icons"
import type { AddedBy, Category, PaymentMode, Transaction } from "@/lib/types"

export function TransactionRow({
  transaction: tx,
  category,
  addedByNames,
  categories,
  paymentModes,
}: {
  transaction: Transaction
  category: Category | undefined
  addedByNames: Record<AddedBy, string>
  categories: Category[]
  paymentModes: PaymentMode[]
}) {
  const [open, setOpen] = useState(false)
  const [localCategories, setLocalCategories] = useState(categories)
  const [localPaymentModes, setLocalPaymentModes] = useState(paymentModes)

  return (
    <>
      <li className="first:[&>button]:pt-0 last:[&>button]:pb-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hover:bg-muted/50 -mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors"
        >
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `${category?.ColorHex ?? "#999"}20`,
              color: category?.ColorHex ?? "#999",
            }}
          >
            <CategoryIcon name={category?.Icon ?? ""} className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{tx.CategoryName}</span>
              {tx.IsRecurring ? (
                <Badge variant="secondary" className="text-xs">
                  Recurring
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {tx.Date} · {addedByNames[tx.AddedBy]}
              {tx.PaymentModeName ? ` · ${tx.PaymentModeName}` : ""}
              {tx.Note ? ` · ${tx.Note}` : ""}
            </p>
          </div>
          <span
            className={
              tx.Type === "Income" ? "font-medium text-emerald-600" : "font-medium"
            }
          >
            {tx.Type === "Income" ? "+" : "-"}₹{tx.Amount.toFixed(2)}
          </span>
        </button>
      </li>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[90vh] max-w-lg rounded-t-xl"
        >
          <SheetHeader>
            <SheetTitle>Edit transaction</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <TransactionForm
              transaction={tx}
              categories={localCategories}
              paymentModes={localPaymentModes}
              addedByNames={addedByNames}
              onCategoryCreated={(category) =>
                setLocalCategories((prev) => [...prev, category])
              }
              onPaymentModeCreated={(paymentMode) =>
                setLocalPaymentModes((prev) => [...prev, paymentMode])
              }
              onSuccess={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function TransactionList({
  transactions,
  categoriesById,
  categories,
  paymentModes,
  addedByNames,
  emptyMessage = "No transactions yet. Tap the + button to add one.",
}: {
  transactions: Transaction[]
  categoriesById: Map<string, Category>
  categories: Category[]
  paymentModes: PaymentMode[]
  addedByNames: Record<AddedBy, string>
  emptyMessage?: string
}) {
  if (transactions.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>
  }

  return (
    <ul className="divide-y">
      {transactions.map((tx) => (
        <TransactionRow
          key={tx.TxID}
          transaction={tx}
          category={categoriesById.get(tx.CategoryID)}
          addedByNames={addedByNames}
          categories={categories}
          paymentModes={paymentModes}
        />
      ))}
    </ul>
  )
}

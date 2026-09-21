"use client"

import { useState } from "react"

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { TransactionRow } from "@/components/transactions/transaction-list"
import { groupTransactionsByMonthAndDate } from "@/lib/transaction-groups"
import type { AddedBy, Category, Event, PaymentMode, Transaction } from "@/lib/types"

export function GroupedTransactionList({
  transactions,
  categoriesById,
  categories,
  paymentModes,
  events,
  addedByNames,
  byBillingCycle = false,
  emptyMessage = "No transactions yet. Tap the + button to add one.",
}: {
  transactions: Transaction[]
  categoriesById: Map<string, Category>
  categories: Category[]
  paymentModes: PaymentMode[]
  events: Event[]
  addedByNames: Record<AddedBy, string>
  byBillingCycle?: boolean
  emptyMessage?: string
}) {
  const monthGroups = groupTransactionsByMonthAndDate(transactions, { byBillingCycle })
  const defaultOpen = monthGroups.slice(0, 1).map((group) => group.month)

  // The set of months (and which one should start open) shifts whenever the
  // filtered transactions change. Base UI's Accordion is uncontrolled, so we
  // drive it ourselves and re-sync `openMonths` to the new default here
  // (adjusting state during render, per https://react.dev/learn/you-might-not-need-an-effect)
  // rather than passing a moving `defaultValue`, which it warns against.
  const [openMonths, setOpenMonths] = useState(defaultOpen)
  const [prevDefaultOpen, setPrevDefaultOpen] = useState(defaultOpen)
  if (defaultOpen.join(",") !== prevDefaultOpen.join(",")) {
    setPrevDefaultOpen(defaultOpen)
    setOpenMonths(defaultOpen)
  }

  if (transactions.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>
  }

  return (
    <Accordion value={openMonths} onValueChange={setOpenMonths} multiple>
      {monthGroups.map((monthGroup) => {
        const count = monthGroup.dateGroups.reduce(
          (sum, dateGroup) => sum + dateGroup.transactions.length,
          0
        )

        return (
          <AccordionItem key={monthGroup.month} value={monthGroup.month}>
            <AccordionTrigger>
              <span className="text-primary text-base font-bold tracking-tight">
                {monthGroup.label}
                {byBillingCycle ? (
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    billing cycle
                  </span>
                ) : null}
              </span>
              <span className="text-muted-foreground mr-auto text-xs font-normal">
                {count} {count === 1 ? "transaction" : "transactions"}
              </span>
              <span className="text-sm font-semibold">
                {monthGroup.total < 0 ? "+" : ""}₹{Math.abs(monthGroup.total).toFixed(2)}
              </span>
            </AccordionTrigger>
            <AccordionPanel>
              <div className="flex flex-col gap-3">
                {monthGroup.dateGroups.map((dateGroup) => (
                  <div key={dateGroup.date}>
                    <p className="text-foreground mb-1.5 text-sm font-semibold">
                      {dateGroup.label}
                    </p>
                    <ul className="divide-y">
                      {dateGroup.transactions.map((tx) => (
                        <TransactionRow
                          key={tx.TxID}
                          transaction={tx}
                          category={categoriesById.get(tx.CategoryID)}
                          addedByNames={addedByNames}
                          categories={categories}
                          paymentModes={paymentModes}
                          events={events}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </AccordionPanel>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

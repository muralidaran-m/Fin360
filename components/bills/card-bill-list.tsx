"use client"

import { useState } from "react"

import { BillPaidToggle } from "@/components/bills/bill-paid-toggle"
import { TransactionList } from "@/components/transactions/transaction-list"
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import type { CreditCardBill } from "@/lib/analytics"
import { parseIsoDate } from "@/lib/credit-card"
import { sortTransactionsByRecency } from "@/lib/transaction-groups"
import type { AddedBy, Category, Event, PaymentMode, Transaction } from "@/lib/types"

const DUE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

function formatShort(date: string): string {
  return SHORT_DATE_FORMATTER.format(parseIsoDate(date))
}

/** The statement window, or the span of actual purchases when it can't be determined. */
function periodLabel(bill: CreditCardBill): string {
  if (bill.period) return `${formatShort(bill.period.start)} – ${formatShort(bill.period.end)}`

  const dates = bill.transactions.map((t: Transaction) => t.Date).sort()
  const first = dates[0]
  const last = dates[dates.length - 1]
  if (first === last) return `Purchased ${formatShort(first)}`
  return `Purchased ${formatShort(first)} – ${formatShort(last)}`
}

function StatusBadge({ bill }: { bill: CreditCardBill }) {
  if (bill.status === "open") return <Badge variant="secondary">Current cycle</Badge>
  if (bill.status === "upcoming") return <Badge variant="outline">Upcoming</Badge>
  if (bill.status === "due" && !bill.paid) {
    const days = bill.daysUntilDue
    const label =
      days === 0 ? "Due today" : `Due in ${days} ${days === 1 ? "day" : "days"}`
    return (
      <Badge variant="outline" className="border-status-critical text-status-critical">
        {label}
      </Badge>
    )
  }
  return null
}

export function CardBillList({
  paymentModeId,
  bills,
  canTrackPaid,
  categoriesById,
  categories,
  paymentModes,
  events,
  addedByNames,
}: {
  paymentModeId: string
  bills: CreditCardBill[]
  canTrackPaid: boolean
  categoriesById: Map<string, Category>
  categories: Category[]
  paymentModes: PaymentMode[]
  events: Event[]
  addedByNames: Record<AddedBy, string>
}) {
  const [openBills, setOpenBills] = useState<string[]>(() => {
    const latest = bills.find((b) => b.status !== "upcoming" && b.transactions.length > 0)
    return latest ? [latest.dueDate] : []
  })

  return (
    <Accordion value={openBills} onValueChange={setOpenBills} multiple>
      {bills.map((bill) => {
        const count = bill.transactions.length
        const closed = bill.status === "due" || bill.status === "past"
        return (
          <AccordionItem key={bill.dueDate} value={bill.dueDate}>
            {/* The toggle is a sibling of the trigger, as buttons can't nest; it drops below on phones. */}
            <div className="flex flex-wrap items-center gap-x-3">
              <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                <AccordionTrigger>
                  <div className="mr-auto min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold">
                        Due {DUE_DATE_FORMATTER.format(parseIsoDate(bill.dueDate))}
                      </span>
                      <StatusBadge bill={bill} />
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs font-normal">
                      {periodLabel(bill)} · {count} {count === 1 ? "transaction" : "transactions"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">₹{bill.amount.toFixed(2)}</p>
                    {bill.credits > 0 ? (
                      <p className="text-xs font-normal text-emerald-600">
                        +₹{bill.credits.toFixed(2)} credited
                      </p>
                    ) : null}
                  </div>
                </AccordionTrigger>
              </div>
              {closed && canTrackPaid ? (
                <div className="pb-2.5 sm:pb-0">
                  <BillPaidToggle
                    paymentModeId={paymentModeId}
                    dueDate={bill.dueDate}
                    paid={bill.paid}
                    overdue={bill.status === "past"}
                  />
                </div>
              ) : null}
            </div>
            <AccordionPanel>
              <TransactionList
                transactions={sortTransactionsByRecency(bill.transactions)}
                categoriesById={categoriesById}
                categories={categories}
                paymentModes={paymentModes}
                events={events}
                addedByNames={addedByNames}
                emptyMessage="No spend on this cycle yet."
                hideBillBadge
              />
            </AccordionPanel>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

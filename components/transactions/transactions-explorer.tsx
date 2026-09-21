"use client"

import { XIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { GroupedTransactionList } from "@/components/transactions/grouped-transaction-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AddedBy, Category, Event, PaymentMode, Transaction } from "@/lib/types"

function matchesQuery(
  tx: Transaction,
  addedByNames: Record<AddedBy, string>,
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) return true

  const haystack = [
    tx.CategoryName,
    tx.Note,
    tx.PaymentModeName,
    addedByNames[tx.AddedBy],
    tx.Amount.toString(),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(normalizedQuery)
}

const ALL_EVENTS_VALUE = "__all__"
const ALL_PAYMENT_MODES_VALUE = "__all__"

export function TransactionsExplorer({
  transactions,
  categories,
  paymentModes,
  events,
  addedByNames,
}: {
  transactions: Transaction[]
  categories: Category[]
  paymentModes: PaymentMode[]
  events: Event[]
  addedByNames: Record<AddedBy, string>
}) {
  const [query, setQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [eventId, setEventId] = useState(ALL_EVENTS_VALUE)
  const [paymentModeId, setPaymentModeId] = useState(ALL_PAYMENT_MODES_VALUE)

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.CategoryID, c])),
    [categories]
  )

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return transactions.filter((tx) => {
      if (dateFrom && tx.Date < dateFrom) return false
      if (dateTo && tx.Date > dateTo) return false
      if (eventId !== ALL_EVENTS_VALUE && tx.EventID !== eventId) return false
      if (paymentModeId !== ALL_PAYMENT_MODES_VALUE && tx.PaymentModeID !== paymentModeId)
        return false
      return matchesQuery(tx, addedByNames, normalizedQuery)
    })
  }, [transactions, addedByNames, query, dateFrom, dateTo, eventId, paymentModeId])

  const selectedEvent = events.find((e) => e.EventID === eventId)
  const selectedPaymentMode = paymentModes.find((p) => p.PaymentModeID === paymentModeId)

  const eventTotal = useMemo(() => {
    if (!selectedEvent) return null
    return filtered.reduce(
      (sum, tx) => sum + (tx.Type === "Income" ? -tx.Amount : tx.Amount),
      0
    )
  }, [filtered, selectedEvent])

  const hasActiveFilters = Boolean(
    query ||
      dateFrom ||
      dateTo ||
      eventId !== ALL_EVENTS_VALUE ||
      paymentModeId !== ALL_PAYMENT_MODES_VALUE
  )

  const clearFilters = () => {
    setQuery("")
    setDateFrom("")
    setDateTo("")
    setEventId(ALL_EVENTS_VALUE)
    setPaymentModeId(ALL_PAYMENT_MODES_VALUE)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="transaction-search"
            className="text-muted-foreground mb-1.5 block text-xs font-medium"
          >
            Search
          </label>
          <Input
            id="transaction-search"
            type="text"
            placeholder="Note, category, amount, payment mode, or person"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div>
            <label
              htmlFor="transaction-date-from"
              className="text-muted-foreground mb-1.5 block text-xs font-medium"
            >
              From
            </label>
            <Input
              id="transaction-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="transaction-date-to"
              className="text-muted-foreground mb-1.5 block text-xs font-medium"
            >
              To
            </label>
            <Input
              id="transaction-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="transaction-event"
              className="text-muted-foreground mb-1.5 block text-xs font-medium"
            >
              Event
            </label>
            <Select
              value={eventId}
              onValueChange={(value) => setEventId(value ?? ALL_EVENTS_VALUE)}
            >
              <SelectTrigger id="transaction-event" className="w-40">
                <SelectValue>
                  {(value: string) =>
                    events.find((e) => e.EventID === value)?.Name ?? "All events"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_EVENTS_VALUE}>All events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.EventID} value={event.EventID}>
                    {event.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              htmlFor="transaction-payment-mode"
              className="text-muted-foreground mb-1.5 block text-xs font-medium"
            >
              Payment mode
            </label>
            <Select
              value={paymentModeId}
              onValueChange={(value) => setPaymentModeId(value ?? ALL_PAYMENT_MODES_VALUE)}
            >
              <SelectTrigger id="transaction-payment-mode" className="w-40">
                <SelectValue>
                  {(value: string) =>
                    paymentModes.find((p) => p.PaymentModeID === value)?.Name ??
                    "All payment modes"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PAYMENT_MODES_VALUE}>All payment modes</SelectItem>
                {paymentModes.map((paymentMode) => (
                  <SelectItem
                    key={paymentMode.PaymentModeID}
                    value={paymentMode.PaymentModeID}
                  >
                    {paymentMode.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon />
            Clear filters
          </Button>
        ) : null}
      </div>

      {selectedEvent ? (
        <div className="bg-muted/50 flex items-center justify-between rounded-lg border px-4 py-3">
          <span className="text-sm font-medium">{selectedEvent.Name}</span>
          <span className="text-sm">
            {filtered.length} {filtered.length === 1 ? "transaction" : "transactions"} ·{" "}
            <span className="font-semibold">
              {eventTotal !== null && eventTotal < 0 ? "+" : ""}₹
              {Math.abs(eventTotal ?? 0).toFixed(2)}
            </span>
          </span>
        </div>
      ) : null}

      <GroupedTransactionList
        transactions={filtered}
        categoriesById={categoriesById}
        categories={categories}
        paymentModes={paymentModes}
        events={events}
        addedByNames={addedByNames}
        byBillingCycle={selectedPaymentMode?.Kind === "CreditCard"}
        emptyMessage={
          hasActiveFilters
            ? "No transactions match your filters."
            : "No transactions yet. Tap the + button to add one."
        }
      />
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"

import { GroupedTransactionList } from "@/components/transactions/grouped-transaction-list"
import { Input } from "@/components/ui/input"
import type { AddedBy, Category, Transaction } from "@/lib/types"

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

export function TransactionsExplorer({
  transactions,
  categories,
  addedByNames,
}: {
  transactions: Transaction[]
  categories: Category[]
  addedByNames: Record<AddedBy, string>
}) {
  const [query, setQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.CategoryID, c])),
    [categories]
  )

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return transactions.filter((tx) => {
      if (dateFrom && tx.Date < dateFrom) return false
      if (dateTo && tx.Date > dateTo) return false
      return matchesQuery(tx, addedByNames, normalizedQuery)
    })
  }, [transactions, addedByNames, query, dateFrom, dateTo])

  const hasActiveFilters = Boolean(query || dateFrom || dateTo)

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
        </div>
      </div>

      <GroupedTransactionList
        transactions={filtered}
        categoriesById={categoriesById}
        addedByNames={addedByNames}
        emptyMessage={
          hasActiveFilters
            ? "No transactions match your filters."
            : "No transactions yet. Tap the + button to add one."
        }
      />
    </div>
  )
}

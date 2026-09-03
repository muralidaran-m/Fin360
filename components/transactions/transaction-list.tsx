import { Badge } from "@/components/ui/badge"
import { CategoryIcon } from "@/lib/icons"
import type { AddedBy, Category, Transaction } from "@/lib/types"

export function TransactionRow({
  transaction: tx,
  category,
  addedByNames,
}: {
  transaction: Transaction
  category: Category | undefined
  addedByNames: Record<AddedBy, string>
}) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
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
    </li>
  )
}

export function TransactionList({
  transactions,
  categoriesById,
  addedByNames,
  emptyMessage = "No transactions yet. Tap the + button to add one.",
}: {
  transactions: Transaction[]
  categoriesById: Map<string, Category>
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
        />
      ))}
    </ul>
  )
}

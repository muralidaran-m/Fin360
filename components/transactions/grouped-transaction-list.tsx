import { TransactionRow } from "@/components/transactions/transaction-list"
import { groupTransactionsByMonthAndDate } from "@/lib/transaction-groups"
import type { AddedBy, Category, Transaction } from "@/lib/types"

export function GroupedTransactionList({
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

  const monthGroups = groupTransactionsByMonthAndDate(transactions)

  return (
    <div className="flex flex-col gap-6">
      {monthGroups.map((monthGroup) => (
        <div key={monthGroup.month} className="flex flex-col gap-4">
          <h2 className="text-primary text-sm font-semibold">{monthGroup.label}</h2>
          <div className="flex flex-col gap-3">
            {monthGroup.dateGroups.map((dateGroup) => (
              <div key={dateGroup.date}>
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  {dateGroup.label}
                </p>
                <ul className="divide-y">
                  {dateGroup.transactions.map((tx) => (
                    <TransactionRow
                      key={tx.TxID}
                      transaction={tx}
                      category={categoriesById.get(tx.CategoryID)}
                      addedByNames={addedByNames}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

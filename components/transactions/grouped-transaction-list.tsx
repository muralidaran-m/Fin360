import { TransactionRow } from "@/components/transactions/transaction-list"
import { groupTransactionsByMonthAndDate } from "@/lib/transaction-groups"
import type { AddedBy, Category, PaymentMode, Transaction } from "@/lib/types"

export function GroupedTransactionList({
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

  const monthGroups = groupTransactionsByMonthAndDate(transactions)

  return (
    <div className="flex flex-col gap-6">
      {monthGroups.map((monthGroup) => (
        <div key={monthGroup.month} className="flex flex-col gap-4">
          <h2 className="text-primary border-primary/30 border-b-2 pb-1.5 text-base font-bold tracking-tight">
            {monthGroup.label}
          </h2>
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

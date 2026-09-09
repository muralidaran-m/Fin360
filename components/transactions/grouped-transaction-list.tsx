import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
  const defaultOpen = monthGroups.slice(0, 1).map((group) => group.month)

  return (
    <Accordion defaultValue={defaultOpen} multiple>
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
              </span>
              <span className="text-muted-foreground mr-auto text-xs font-normal">
                {count} {count === 1 ? "transaction" : "transactions"}
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

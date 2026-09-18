import { TransactionsExplorer } from "@/components/transactions/transactions-explorer"
import { Card, CardContent } from "@/components/ui/card"
import {
  getAddedByNames,
  getCategories,
  getEvents,
  getPaymentModes,
  getTransactions,
} from "@/lib/data"

export const dynamic = "force-dynamic"

export default async function TransactionsPage() {
  const [categories, paymentModes, events, transactions, addedByNames] = await Promise.all([
    getCategories(),
    getPaymentModes(),
    getEvents(),
    getTransactions(),
    getAddedByNames(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <TransactionsExplorer
            transactions={transactions}
            categories={categories}
            paymentModes={paymentModes}
            events={events}
            addedByNames={addedByNames}
          />
        </CardContent>
      </Card>
    </div>
  )
}

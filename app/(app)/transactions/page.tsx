import { TransactionsExplorer } from "@/components/transactions/transactions-explorer"
import { Card, CardContent } from "@/components/ui/card"
import { getAddedByNames, getCategories, getTransactions } from "@/lib/data"

export const dynamic = "force-dynamic"

export default async function TransactionsPage() {
  const [categories, transactions, addedByNames] = await Promise.all([
    getCategories(),
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
            addedByNames={addedByNames}
          />
        </CardContent>
      </Card>
    </div>
  )
}

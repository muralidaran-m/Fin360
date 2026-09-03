import { GroupedTransactionList } from "@/components/transactions/grouped-transaction-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAddedByNames, getCategories, getTransactions } from "@/lib/data"

export const dynamic = "force-dynamic"

export default async function TransactionsPage() {
  const [categories, transactions, addedByNames] = await Promise.all([
    getCategories(),
    getTransactions(),
    getAddedByNames(),
  ])

  const categoriesById = new Map(categories.map((c) => [c.CategoryID, c]))

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupedTransactionList
            transactions={transactions}
            categoriesById={categoriesById}
            addedByNames={addedByNames}
          />
        </CardContent>
      </Card>
    </div>
  )
}

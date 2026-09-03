import { TransactionList } from "@/components/transactions/transaction-list"
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
  const sorted = [...transactions].sort((a, b) => b.Date.localeCompare(a.Date))

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={sorted}
            categoriesById={categoriesById}
            addedByNames={addedByNames}
          />
        </CardContent>
      </Card>
    </div>
  )
}

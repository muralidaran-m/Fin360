import Link from "next/link"

import { CardBillList } from "@/components/bills/card-bill-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { creditCardBillHistories } from "@/lib/analytics"
import {
  getAddedByNames,
  getCategories,
  getEvents,
  getPaymentModes,
  getTransactions,
} from "@/lib/data"

export const dynamic = "force-dynamic"

export default async function BillsPage() {
  const [categories, paymentModes, events, transactions, addedByNames] = await Promise.all([
    getCategories(),
    getPaymentModes(),
    getEvents(),
    getTransactions(),
    getAddedByNames(),
  ])

  const histories = creditCardBillHistories(transactions, paymentModes)
  const categoriesById = new Map(categories.map((c) => [c.CategoryID, c]))

  if (histories.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No credit cards yet. Add one in{" "}
            <Link href="/settings" className="text-foreground underline underline-offset-4">
              Settings
            </Link>{" "}
            to see its bills here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    // Bottom padding keeps the last bill's amount clear of the floating add button.
    <div className="flex flex-col gap-6 pb-20">
      {histories.map((history) => (
        <Card key={history.paymentModeId} id={history.paymentModeId} className="scroll-mt-6">
          <CardHeader>
            <CardTitle>{history.paymentModeName}</CardTitle>
            {history.statementDay > 0 && history.dueDays > 0 ? (
              <p className="text-muted-foreground text-xs">
                Statement on day {history.statementDay} · due {history.dueDays} days later
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            <CardBillList
              bills={history.bills}
              categoriesById={categoriesById}
              categories={categories}
              paymentModes={paymentModes}
              events={events}
              addedByNames={addedByNames}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

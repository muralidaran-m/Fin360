import Link from "next/link"

import { CardBillList } from "@/components/bills/card-bill-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { creditCardBillHistories } from "@/lib/analytics"
import {
  getAddedByNames,
  getCardBillPayments,
  getCategories,
  getEvents,
  getPaymentModes,
  getTransactions,
} from "@/lib/data"

export const dynamic = "force-dynamic"

/** Null until `npm run init-sheets` has created the tab; bills still render without it. */
async function loadPaidBillIds(): Promise<Set<string> | null> {
  try {
    const payments = await getCardBillPayments()
    return new Set(payments.filter((p) => p.Paid).map((p) => p.BillID))
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found in workbook")) return null
    throw err
  }
}

export default async function BillsPage() {
  const [categories, paymentModes, events, transactions, addedByNames, paidBillIds] =
    await Promise.all([
      getCategories(),
      getPaymentModes(),
      getEvents(),
      getTransactions(),
      getAddedByNames(),
      loadPaidBillIds(),
    ])

  const histories = creditCardBillHistories(
    transactions,
    paymentModes,
    new Date(),
    paidBillIds ?? new Set()
  )
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
      {paidBillIds === null ? (
        <p className="text-muted-foreground text-xs">
          Paid status is off until the sheet tab exists. Run <code>npm run init-sheets</code>.
        </p>
      ) : null}
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
              paymentModeId={history.paymentModeId}
              bills={history.bills}
              canTrackPaid={paidBillIds !== null}
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

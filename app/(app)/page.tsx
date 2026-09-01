import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategories, getTransactions } from "@/lib/data"
import { getCategoryIcon } from "@/lib/icons"

export const dynamic = "force-dynamic"

export default async function Home() {
  const [categories, transactions] = await Promise.all([
    getCategories(),
    getTransactions(),
  ])

  const categoriesById = new Map(categories.map((c) => [c.CategoryID, c]))
  const recent = [...transactions]
    .sort((a, b) => b.Date.localeCompare(a.Date))
    .slice(0, 20)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No transactions yet. Tap the + button to add one.
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((tx) => {
                const category = categoriesById.get(tx.CategoryID)
                const Icon = getCategoryIcon(category?.Icon ?? "")
                return (
                  <li
                    key={tx.TxID}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `${category?.ColorHex ?? "#999"}20`,
                        color: category?.ColorHex ?? "#999",
                      }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {tx.CategoryName}
                        </span>
                        {tx.IsRecurring ? (
                          <Badge variant="secondary" className="text-xs">
                            Recurring
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        {tx.Date} · {tx.AddedBy}
                        {tx.Note ? ` · ${tx.Note}` : ""}
                      </p>
                    </div>
                    <span
                      className={
                        tx.Type === "Income"
                          ? "font-medium text-emerald-600"
                          : "font-medium"
                      }
                    >
                      {tx.Type === "Income" ? "+" : "-"}₹{tx.Amount.toFixed(2)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

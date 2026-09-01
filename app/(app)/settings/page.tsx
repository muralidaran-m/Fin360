import { AddCategoryButton } from "@/app/(app)/settings/add-category-button"
import { AddPaymentModeButton } from "@/app/(app)/settings/add-payment-mode-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategories, getPaymentModes } from "@/lib/data"
import { getCategoryIcon } from "@/lib/icons"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const [categories, paymentModes] = await Promise.all([
    getCategories(),
    getPaymentModes(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categories</CardTitle>
          <AddCategoryButton />
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No categories yet. Add your first one.
            </p>
          ) : (
            <ul className="divide-y">
              {categories.map((category) => {
                const Icon = getCategoryIcon(category.Icon)
                return (
                  <li
                    key={category.CategoryID}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `${category.ColorHex}20`,
                        color: category.ColorHex,
                      }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <span className="flex-1 font-medium">{category.Name}</span>
                    <Badge variant="secondary">{category.Type}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Modes</CardTitle>
          <AddPaymentModeButton />
        </CardHeader>
        <CardContent>
          {paymentModes.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No payment modes yet. Add your first one.
            </p>
          ) : (
            <ul className="divide-y">
              {paymentModes.map((paymentMode) => (
                <li
                  key={paymentMode.PaymentModeID}
                  className="flex items-center py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex-1 font-medium">{paymentMode.Name}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

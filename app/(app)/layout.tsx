import { AppSidebar } from "@/components/app-sidebar"
import { QuickAddTransaction } from "@/components/quick-add-transaction"
import { getAddedByNames, getCategories, getPaymentModes } from "@/lib/data"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [categories, paymentModes, addedByNames] = await Promise.all([
    getCategories(),
    getPaymentModes(),
    getAddedByNames(),
  ])

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <AppSidebar />

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>

      <QuickAddTransaction
        categories={categories}
        paymentModes={paymentModes}
        addedByNames={addedByNames}
      />
    </div>
  )
}

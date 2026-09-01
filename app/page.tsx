import { logout } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCategories, getTransactions } from "@/lib/data"

export const dynamic = "force-dynamic"

export default async function Home() {
  const [categories, transactions] = await Promise.all([
    getCategories(),
    getTransactions(),
  ])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fin360</h1>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection check</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          <p>Categories in sheet: {categories.length}</p>
          <p>Transactions in sheet: {transactions.length}</p>
        </CardContent>
      </Card>
    </div>
  )
}

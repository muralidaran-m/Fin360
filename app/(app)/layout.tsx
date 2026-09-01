import Link from "next/link"

import { logout } from "@/app/login/actions"
import { QuickAddTransaction } from "@/components/quick-add-transaction"
import { Button } from "@/components/ui/button"
import { getCategories } from "@/lib/data"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const categories = await getCategories()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold">
            Fin360
          </Link>
          <Link href="/settings" className="text-muted-foreground text-sm">
            Settings
          </Link>
        </nav>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4">{children}</main>

      <QuickAddTransaction categories={categories} />
    </div>
  )
}

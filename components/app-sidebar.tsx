"use client"

import {
  LayoutDashboard,
  Menu,
  PiggyBank,
  Receipt,
  Settings as SettingsIcon,
  Target,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { logout } from "@/app/login/actions"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const NAV_ITEMS: {
  href: string
  label: string
  icon: LucideIcon
  colorVar: string
}[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    colorVar: "--section-dashboard",
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: Receipt,
    colorVar: "--section-transactions",
  },
  {
    href: "/budget",
    label: "Budget",
    icon: PiggyBank,
    colorVar: "--section-budget",
  },
  {
    href: "/planner",
    label: "Planner",
    icon: Target,
    colorVar: "--section-planner",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    colorVar: "--section-settings",
  },
]

function SidebarBrand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-4 py-5">
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size local asset, no optimization needed */}
      <img src="/logo-icon.png" alt="" width={32} height={32} className="rounded-lg" />
      <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
        <span className="text-sidebar-primary">Namma</span>Ledger
      </span>
    </Link>
  )
}

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon
              className="size-4 shrink-0"
              style={active ? { color: `var(${item.colorVar})` } : undefined}
            />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  return (
    <div className="border-sidebar-border flex items-center justify-between border-t px-3 py-3">
      <ThemeToggle />
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  )
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-svh w-60 shrink-0 flex-col md:flex">
        <SidebarBrand />
        <SidebarLinks />
        <SidebarFooter />
      </aside>

      <header className="bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size local asset, no optimization needed */}
          <img src="/logo-icon.png" alt="" width={28} height={28} className="rounded-lg" />
          <span className="text-base font-bold tracking-tight">
            <span className="text-sidebar-primary">Namma</span>Ledger
          </span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="bg-sidebar text-sidebar-foreground flex w-64 flex-col gap-0 border-none p-0"
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarBrand />
          <SidebarLinks onNavigate={() => setMobileOpen(false)} />
          <SidebarFooter />
        </SheetContent>
      </Sheet>
    </>
  )
}

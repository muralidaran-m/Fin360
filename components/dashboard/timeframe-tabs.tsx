import Link from "next/link"

import { cn } from "@/lib/utils"
import { TIMEFRAME_LABELS, type Timeframe } from "@/lib/analytics"

const TIMEFRAMES = Object.keys(TIMEFRAME_LABELS) as Timeframe[]

export function TimeframeTabs({ active }: { active: Timeframe }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border p-1">
      {TIMEFRAMES.map((tf) => (
        <Link
          key={tf}
          href={tf === "current" ? "/" : `/?range=${tf}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            active === tf
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {TIMEFRAME_LABELS[tf]}
        </Link>
      ))}
    </div>
  )
}

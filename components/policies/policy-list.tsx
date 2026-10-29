"use client"

import { useState } from "react"

import { PolicyCard } from "@/components/policies/policy-card"
import { Button } from "@/components/ui/button"
import type { PolicyInsight } from "@/lib/policy"

export function PolicyList({ insights, today }: { insights: PolicyInsight[]; today: Date }) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(insights.map((i) => i.policy.PolicyID))
  )
  const allOpen = openIds.size === insights.length

  function setOpen(id: string, open: boolean) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {insights.length > 1 ? (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setOpenIds(allOpen ? new Set() : new Set(insights.map((i) => i.policy.PolicyID)))
            }
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      ) : null}
      {insights.map((insight) => (
        <PolicyCard
          key={insight.policy.PolicyID}
          insight={insight}
          today={today}
          open={openIds.has(insight.policy.PolicyID)}
          onOpenChange={(open) => setOpen(insight.policy.PolicyID, open)}
        />
      ))}
    </div>
  )
}

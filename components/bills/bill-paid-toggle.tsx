"use client"

import { Check, Circle } from "lucide-react"
import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { setCardBillPaidAction } from "@/app/(app)/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Shows a bill's paid status; clicking flips it. */
export function BillPaidToggle({
  paymentModeId,
  dueDate,
  paid,
  overdue,
}: {
  paymentModeId: string
  dueDate: string
  paid: boolean
  overdue: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [optimisticPaid, setOptimisticPaid] = useOptimistic(paid)

  function toggle() {
    const next = !optimisticPaid
    startTransition(async () => {
      setOptimisticPaid(next)
      const result = await setCardBillPaidAction(paymentModeId, dueDate, next)
      if (result.error) toast.error(result.error)
    })
  }

  const Icon = optimisticPaid ? Check : Circle

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      disabled={pending}
      aria-pressed={optimisticPaid}
      title={optimisticPaid ? "Mark as unpaid" : "Mark as paid"}
      onClick={toggle}
      className={cn(
        "w-20",
        optimisticPaid && "border-emerald-600 text-emerald-600 hover:text-emerald-600",
        !optimisticPaid && overdue && "border-status-critical text-status-critical hover:text-status-critical"
      )}
    >
      <Icon />
      {optimisticPaid ? "Paid" : "Unpaid"}
    </Button>
  )
}

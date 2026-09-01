"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { PaymentModeForm } from "@/components/payment-mode-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PaymentMode } from "@/lib/types"

export function EditPaymentModeButton({ paymentMode }: { paymentMode: PaymentMode }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${paymentMode.Name}`}
      >
        <Pencil className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit payment mode</DialogTitle>
          </DialogHeader>
          <PaymentModeForm
            paymentMode={paymentMode}
            onSuccess={(updated) => {
              setOpen(false)
              toast.success(`Updated payment mode "${updated.Name}"`)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

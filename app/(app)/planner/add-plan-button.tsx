"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { SandboxPlanForm } from "@/components/sandbox-plan-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function AddPlanButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        New plan
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New savings plan</DialogTitle>
          </DialogHeader>
          <SandboxPlanForm
            onSuccess={(plan) => {
              setOpen(false)
              toast.success(`Added plan "${plan.PlanName}"`)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

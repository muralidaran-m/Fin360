"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function DeleteConfirmButton({
  id,
  action,
  variant = "icon",
  className,
  ariaLabel,
  successMessage,
  confirmTitle,
  confirmDescription,
  onDeleted,
}: {
  id: string
  action: (id: string) => Promise<{ error?: string }>
  variant?: "icon" | "button"
  className?: string
  ariaLabel: string
  successMessage: string
  confirmTitle: string
  confirmDescription: string
  onDeleted?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      const result = await action(id)
      if (result.error) {
        setError(result.error)
        return
      }
      setOpen(false)
      toast.success(successMessage)
      router.refresh()
      onDeleted?.()
    })
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
        variant={variant === "icon" ? "ghost" : "destructive"}
        size={variant === "icon" ? "icon-sm" : "default"}
        aria-label={ariaLabel}
        className={cn(variant === "button" && "w-full", className)}
      >
        <Trash2 className="size-4" />
        {variant === "button" ? "Delete" : null}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

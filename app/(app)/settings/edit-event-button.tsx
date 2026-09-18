"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { EventForm } from "@/components/event-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Event } from "@/lib/types"

export function EditEventButton({ event }: { event: Event }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${event.Name}`}
      >
        <Pencil className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit event</DialogTitle>
          </DialogHeader>
          <EventForm
            event={event}
            onSuccess={(updated) => {
              setOpen(false)
              toast.success(`Updated event "${updated.Name}"`)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

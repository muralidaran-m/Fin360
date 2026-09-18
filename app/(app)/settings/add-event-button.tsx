"use client"

import { useState } from "react"
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

export function AddEventButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        Add event
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new event</DialogTitle>
          </DialogHeader>
          <EventForm
            onSuccess={(event) => {
              setOpen(false)
              toast.success(`Added event "${event.Name}"`)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

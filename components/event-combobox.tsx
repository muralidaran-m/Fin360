"use client"

import { useState } from "react"
import { ChevronsUpDown, Plus, X } from "lucide-react"

import { EventForm } from "@/components/event-form"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Event } from "@/lib/types"

export function EventCombobox({
  events,
  value,
  onChange,
  onEventCreated,
}: {
  events: Event[]
  value: string
  onChange: (eventId: string) => void
  onEventCreated: (event: Event) => void
}) {
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const selected = events.find((e) => e.EventID === value)

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              <span className="truncate">
                {selected ? selected.Name : "No event"}
              </span>
              {selected ? (
                <X
                  className="size-4 shrink-0 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange("")
                  }}
                />
              ) : (
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              )}
            </Button>
          }
        />
        <PopoverContent className="w-(--anchor-width) p-0">
          <Command>
            <CommandInput placeholder="Search events..." />
            <CommandList>
              <CommandEmpty>No event found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="No event"
                  data-checked={value === ""}
                  onSelect={() => {
                    onChange("")
                    setOpen(false)
                  }}
                >
                  No event
                </CommandItem>
                {events.map((event) => (
                  <CommandItem
                    key={event.EventID}
                    value={event.Name}
                    data-checked={event.EventID === value}
                    onSelect={() => {
                      onChange(event.EventID)
                      setOpen(false)
                    }}
                  >
                    {event.Name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setAddOpen(true)
                  }}
                >
                  <Plus className="size-4" />
                  Add new event
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new event</DialogTitle>
          </DialogHeader>
          <EventForm
            onSuccess={(event) => {
              setAddOpen(false)
              onEventCreated(event)
              onChange(event.EventID)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

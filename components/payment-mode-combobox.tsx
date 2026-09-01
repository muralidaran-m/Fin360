"use client"

import { useState } from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import { PaymentModeForm } from "@/components/payment-mode-form"
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
import type { PaymentMode } from "@/lib/types"

export function PaymentModeCombobox({
  paymentModes,
  value,
  onChange,
  onPaymentModeCreated,
}: {
  paymentModes: PaymentMode[]
  value: string
  onChange: (paymentModeId: string) => void
  onPaymentModeCreated: (paymentMode: PaymentMode) => void
}) {
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const selected = paymentModes.find((p) => p.PaymentModeID === value)

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
                {selected ? selected.Name : "Select payment mode..."}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-(--anchor-width) p-0">
          <Command>
            <CommandInput placeholder="Search payment modes..." />
            <CommandList>
              <CommandEmpty>No payment mode found.</CommandEmpty>
              <CommandGroup>
                {paymentModes.map((paymentMode) => (
                  <CommandItem
                    key={paymentMode.PaymentModeID}
                    value={paymentMode.Name}
                    data-checked={paymentMode.PaymentModeID === value}
                    onSelect={() => {
                      onChange(paymentMode.PaymentModeID)
                      setOpen(false)
                    }}
                  >
                    {paymentMode.Name}
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
                  Add new payment mode
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new payment mode</DialogTitle>
          </DialogHeader>
          <PaymentModeForm
            onSuccess={(paymentMode) => {
              setAddOpen(false)
              onPaymentModeCreated(paymentMode)
              onChange(paymentMode.PaymentModeID)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

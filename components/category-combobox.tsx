"use client"

import { useState } from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import { CategoryForm } from "@/components/category-form"
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
import { CategoryIcon, getCategoryIcon } from "@/lib/icons"
import type { Category } from "@/lib/types"

export function CategoryCombobox({
  categories,
  value,
  onChange,
  onCategoryCreated,
}: {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
  onCategoryCreated: (category: Category) => void
}) {
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const selected = categories.find((c) => c.CategoryID === value)

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
              <span className="flex items-center gap-2 truncate">
                {selected ? (
                  <CategoryIcon name={selected.Icon} className="size-4 shrink-0" />
                ) : null}
                {selected ? selected.Name : "Select category..."}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-(--anchor-width) p-0">
          <Command>
            <CommandInput placeholder="Search categories..." />
            <CommandList>
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                {categories.map((category) => {
                  const Icon = getCategoryIcon(category.Icon)
                  return (
                    <CommandItem
                      key={category.CategoryID}
                      value={category.Name}
                      data-checked={category.CategoryID === value}
                      onSelect={() => {
                        onChange(category.CategoryID)
                        setOpen(false)
                      }}
                    >
                      <Icon
                        className="size-4"
                        style={{ color: category.ColorHex }}
                      />
                      {category.Name}
                    </CommandItem>
                  )
                })}
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
                  Add new category
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new category</DialogTitle>
          </DialogHeader>
          <CategoryForm
            onSuccess={(category) => {
              setAddOpen(false)
              onCategoryCreated(category)
              onChange(category.CategoryID)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

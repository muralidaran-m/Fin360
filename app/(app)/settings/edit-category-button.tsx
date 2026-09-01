"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { CategoryForm } from "@/components/category-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Category } from "@/lib/types"

export function EditCategoryButton({ category }: { category: Category }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${category.Name}`}
      >
        <Pencil className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <CategoryForm
            category={category}
            onSuccess={(updated) => {
              setOpen(false)
              toast.success(`Updated category "${updated.Name}"`)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

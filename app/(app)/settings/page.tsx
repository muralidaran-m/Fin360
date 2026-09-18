import {
  deleteCategoryAction,
  deleteEventAction,
  deletePaymentModeAction,
} from "@/app/(app)/actions"
import { AddCategoryButton } from "@/app/(app)/settings/add-category-button"
import { AddEventButton } from "@/app/(app)/settings/add-event-button"
import { AddPaymentModeButton } from "@/app/(app)/settings/add-payment-mode-button"
import { EditCategoryButton } from "@/app/(app)/settings/edit-category-button"
import { EditEventButton } from "@/app/(app)/settings/edit-event-button"
import { EditPaymentModeButton } from "@/app/(app)/settings/edit-payment-mode-button"
import { DeleteConfirmButton } from "@/components/delete-confirm-button"
import { HouseholdSettingsForm } from "@/components/household-settings-form"
import { SettingsSection } from "@/components/settings-section"
import { Badge } from "@/components/ui/badge"
import { getAddedByNames, getCategories, getEvents, getPaymentModes } from "@/lib/data"
import { getCategoryIcon } from "@/lib/icons"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const [categories, paymentModes, events, addedByNames] = await Promise.all([
    getCategories(),
    getPaymentModes(),
    getEvents(),
    getAddedByNames(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Household">
        <HouseholdSettingsForm names={addedByNames} />
      </SettingsSection>

      <SettingsSection
        title="Categories"
        defaultOpen={false}
        action={<AddCategoryButton />}
      >
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No categories yet. Add your first one.
          </p>
        ) : (
          <ul className="divide-y">
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.Icon)
              return (
                <li
                  key={category.CategoryID}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: `${category.ColorHex}20`,
                      color: category.ColorHex,
                    }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span className="flex-1 font-medium">{category.Name}</span>
                  <Badge variant="secondary">{category.Type}</Badge>
                  <EditCategoryButton category={category} />
                  <DeleteConfirmButton
                    id={category.CategoryID}
                    action={deleteCategoryAction}
                    ariaLabel={`Delete ${category.Name}`}
                    successMessage={`Deleted category "${category.Name}"`}
                    confirmTitle="Delete category"
                    confirmDescription={`This will permanently delete "${category.Name}". This can't be undone.`}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection title="Payment Modes" action={<AddPaymentModeButton />}>
        {paymentModes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No payment modes yet. Add your first one.
          </p>
        ) : (
          <ul className="divide-y">
            {paymentModes.map((paymentMode) => (
              <li
                key={paymentMode.PaymentModeID}
                className="flex items-center py-3 first:pt-0 last:pb-0"
              >
                <span className="flex-1 font-medium">{paymentMode.Name}</span>
                <EditPaymentModeButton paymentMode={paymentMode} />
                <DeleteConfirmButton
                  id={paymentMode.PaymentModeID}
                  action={deletePaymentModeAction}
                  ariaLabel={`Delete ${paymentMode.Name}`}
                  successMessage={`Deleted payment mode "${paymentMode.Name}"`}
                  confirmTitle="Delete payment mode"
                  confirmDescription={`This will permanently delete "${paymentMode.Name}". This can't be undone.`}
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection title="Events" action={<AddEventButton />}>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No events yet. Create one for a trip, festival, or family function to tag
            transactions with it.
          </p>
        ) : (
          <ul className="divide-y">
            {events.map((event) => (
              <li
                key={event.EventID}
                className="flex items-center py-3 first:pt-0 last:pb-0"
              >
                <span className="flex-1 font-medium">{event.Name}</span>
                <EditEventButton event={event} />
                <DeleteConfirmButton
                  id={event.EventID}
                  action={deleteEventAction}
                  ariaLabel={`Delete ${event.Name}`}
                  successMessage={`Deleted event "${event.Name}"`}
                  confirmTitle="Delete event"
                  confirmDescription={`This will permanently delete "${event.Name}". This can't be undone.`}
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
    </div>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible"

export function SettingsSection({
  title,
  action,
  defaultOpen = true,
  children,
}: {
  title: string
  action?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <Card>
      <Collapsible defaultOpen={defaultOpen}>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CollapsibleTrigger className="min-w-0 flex-1">
            <CardTitle>{title}</CardTitle>
          </CollapsibleTrigger>
          {action}
        </CardHeader>
        <CollapsiblePanel>
          <CardContent>{children}</CardContent>
        </CollapsiblePanel>
      </Collapsible>
    </Card>
  )
}

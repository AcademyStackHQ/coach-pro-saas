"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { type SidebarData, SidebarContent } from "./DashboardSidebar"

export function MobileHeader({ data }: { data: SidebarData }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </SheetTrigger>
        <SheetContent side="left" showCloseButton={false} className="w-60 p-0">
          <SidebarContent data={data} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <span className="text-sm font-semibold truncate">
        {data.institution.name}
      </span>
    </header>
  )
}

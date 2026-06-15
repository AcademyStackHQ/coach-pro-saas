"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  Calendar,
  Check,
  ChevronsUpDown,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { selectInstitution, signOut } from "@/app/(auth)/login/actions"

export type InstitutionOption = {
  institution_id: string
  role: string
  name: string
}

export type SidebarData = {
  institution: { id: string; name: string; logo_url: string | null }
  role: string
  allInstitutions: InstitutionOption[]
  user: { full_name: string | null; email: string }
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  student: "Student",
}

const ROLE_CLASSES: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  coach: "bg-amber-50 text-amber-700",
  student: "bg-green-50 text-green-700",
}

type NavItem = { href: string; label: string; icon: React.ElementType }

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/coaches", label: "Coaches", icon: GraduationCap },
  { href: "/dashboard/batches", label: "Batches", icon: Users },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/fees", label: "Fees", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

const COACH_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/batches", label: "My Batches", icon: Users },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
]

const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/calendar", label: "My Schedule", icon: Calendar },
  { href: "/dashboard/fees", label: "My Fees", icon: CreditCard },
]

function getNav(role: string): NavItem[] {
  if (role === "coach") return COACH_NAV
  if (role === "student") return STUDENT_NAV
  return ADMIN_NAV
}

function InstitutionSwitcher({
  current,
  all,
  onSelect,
}: {
  current: SidebarData["institution"] & { role: string }
  all: InstitutionOption[]
  onSelect?: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  if (all.length <= 1) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Building2 className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {current.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {ROLE_LABELS[current.role] ?? current.role}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Building2 className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {current.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {ROLE_LABELS[current.role] ?? current.role}
          </p>
        </div>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md">
          <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Switch institution
          </p>
          {all.map((inst) => (
            <form key={inst.institution_id} action={selectInstitution}>
              <input
                type="hidden"
                name="institution_id"
                value={inst.institution_id}
              />
              <input type="hidden" name="role" value={inst.role} />
              <button
                type="submit"
                onClick={() => {
                  setOpen(false)
                  onSelect?.()
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inst.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {ROLE_LABELS[inst.role] ?? inst.role}
                  </p>
                </div>
                {inst.institution_id === current.id && (
                  <Check className="size-3.5 shrink-0 text-primary" />
                )}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  )
}

function NavLinks({
  role,
  onNavigate,
}: {
  role: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const nav = getNav(role)

  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function UserFooter({ user, role }: { user: SidebarData["user"]; role: string }) {
  const initials = (user.full_name ?? user.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="border-t pt-3">
      <div className="mb-2 flex items-center gap-2.5 px-3 py-1">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {user.full_name ?? "—"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            ROLE_CLASSES[role] ?? "bg-muted text-muted-foreground"
          )}
        >
          {ROLE_LABELS[role] ?? role}
        </span>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </form>
    </div>
  )
}

export function SidebarContent({
  data,
  onNavigate,
}: {
  data: SidebarData
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-4 p-3">
      {/* Logo */}
      <div className="px-3 py-1">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-primary">Coach</span>Pro
        </span>
      </div>

      {/* Institution switcher */}
      <InstitutionSwitcher
        current={{ ...data.institution, role: data.role }}
        all={data.allInstitutions}
        onSelect={onNavigate}
      />

      <div className="h-px bg-border" />

      {/* Nav */}
      <div className="flex-1 overflow-y-auto">
        <NavLinks role={data.role} onNavigate={onNavigate} />
      </div>

      {/* User footer */}
      <UserFooter user={data.user} role={data.role} />
    </div>
  )
}

export function DashboardSidebar({ data }: { data: SidebarData }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background md:flex md:flex-col">
      <SidebarContent data={data} />
    </aside>
  )
}

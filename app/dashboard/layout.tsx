import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import { DashboardSidebar, type SidebarData } from "@/components/dashboard/DashboardSidebar"
import { MobileHeader } from "@/components/dashboard/MobileHeader"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const institutionId = cookieStore.get("active_institution_id")?.value

  if (!institutionId) redirect("/login")

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) redirect("/login")

  const [{ data: institution }, { data: memberships }, { data: profile }] =
    await Promise.all([
      supabase
        .from("institutions")
        .select("id, name, logo_url, onboarding_complete")
        .eq("id", institutionId)
        .single(),
      supabase
        .from("institution_members")
        .select("institution_id, role, institutions(id, name)")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single(),
    ])

  if (!institution) redirect("/login")

  // Derive the role from the actual membership for the active institution —
  // never the unsigned `active_role` cookie. A stale/tampered cookie pointing
  // at an institution the user no longer belongs to lands here with no match.
  const activeMembership = (memberships ?? []).find(
    (m) => m.institution_id === institutionId
  )
  if (!activeMembership) redirect("/login")
  const role = activeMembership.role

  // First-time admin setup: send to the onboarding wizard
  if (role === "admin" && !institution.onboarding_complete) redirect("/onboarding")

  const allInstitutions = (memberships ?? [])
    .filter((m) => m.institutions !== null)
    .map((m) => ({
      institution_id: m.institution_id,
      role: m.role,
      name: (m.institutions as { id: string; name: string }).name,
    }))

  const sidebarData: SidebarData = {
    institution: {
      id: institution.id,
      name: institution.name,
      logo_url: institution.logo_url,
    },
    role,
    allInstitutions,
    user: {
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? "",
    },
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar data={sidebarData} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileHeader data={sidebarData} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}

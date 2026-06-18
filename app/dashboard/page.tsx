import { createClient } from "@/lib/server"
import { getActiveSession } from "@/lib/activeSession"
import { StudentOverview } from "./StudentOverview"

export default async function DashboardPage() {
  // Role/institution verified against the membership row, not the cookie.
  const { userId, institutionId, role } = await getActiveSession()

  // Students get a profile-centric overview (their own record + academy),
  // not the admin/coach stat cards below.
  if (role === "student") return <StudentOverview />

  const supabase = await createClient()

  const [{ data: institution }, { data: profile }] = await Promise.all([
    supabase
      .from("institutions")
      .select("name")
      .eq("id", institutionId)
      .single(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single(),
  ])

  const name = profile?.full_name?.split(" ")[0] ?? "there"
  const roleLabel =
    role === "admin" ? "Admin" : role === "coach" ? "Coach" : "Student"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {name} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {institution?.name} · {roleLabel}
        </p>
      </div>

      {/* Placeholder stat cards — will be filled in later modules */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Members", value: "—" },
          { label: "Active Batches", value: "—" },
          { label: "Sessions This Week", value: "—" },
          { label: "Fees Due", value: "—" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border bg-card p-5 shadow-xs"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

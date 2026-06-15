import { cookies } from "next/headers"
import { createClient } from "@/lib/server"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const institutionId = cookieStore.get("active_institution_id")?.value
  const role = cookieStore.get("active_role")?.value ?? ""

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  const [{ data: institution }, { data: profile }] = await Promise.all([
    supabase
      .from("institutions")
      .select("name")
      .eq("id", institutionId!)
      .single(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId!)
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

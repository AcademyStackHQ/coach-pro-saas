"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import { studentLoginEmail } from "@/lib/utils"

export type InstitutionOption = {
  institution_id: string
  role: string
  name: string
}

export type LoginState = {
  error?: string | null
  institutions?: InstitutionOption[]
}

async function setActiveInstitution(institution_id: string, role: string) {
  const cookieStore = await cookies()
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  }
  cookieStore.set("active_institution_id", institution_id, opts)
  cookieStore.set("active_role", role, opts)
}

export async function loginUser(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = ((formData.get("email") as string) ?? "").trim()
  const password = formData.get("password") as string

  if (!identifier || !password) {
    return { error: "Email or student code and password are required." }
  }

  // Students sign in with their code (no "@"); everyone else with an email.
  // The code maps to its synthetic Supabase Auth email.
  const email = identifier.includes("@")
    ? identifier
    : studentLoginEmail(identifier)

  const supabase = await createClient()

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (signInError || !signInData.user) {
    return { error: "Invalid email/student code or password." }
  }

  // RLS lets a member read the *entire* roster of any institution they belong
  // to, so this must be scoped to the current user — otherwise we'd list other
  // members' rows (and their roles) as if they were the user's own.
  const { data: memberships, error: memberError } = await supabase
    .from("institution_members")
    .select("institution_id, role, institutions(name)")
    .eq("user_id", signInData.user.id)
    .eq("status", "active")

  if (memberError) {
    return { error: "Failed to load your institutions. Please try again." }
  }

  const institutions: InstitutionOption[] = (memberships ?? [])
    .filter((m) => m.institutions !== null)
    .map((m) => ({
      institution_id: m.institution_id,
      role: m.role,
      name: (m.institutions as { name: string }).name,
    }))

  if (institutions.length === 0) {
    redirect("/no-access")
  }

  if (institutions.length === 1) {
    await setActiveInstitution(
      institutions[0].institution_id,
      institutions[0].role
    )
    redirect("/dashboard")
  }

  return { institutions }
}

export async function selectInstitution(formData: FormData) {
  const institution_id = (formData.get("institution_id") as string) ?? ""
  if (!institution_id) redirect("/login")

  // Never trust the institution_id/role posted by the form. Verify the signed-in
  // user actually has an active membership and read the REAL role from it, so a
  // crafted POST can't point the active session at an institution the user
  // doesn't belong to. (Downstream guards re-derive role too, but gate here.)
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect("/login")

  const { data: membership } = await supabase
    .from("institution_members")
    .select("role")
    .eq("user_id", userId)
    .eq("institution_id", institution_id)
    .eq("status", "active")
    .maybeSingle()

  if (!membership) redirect("/login")

  await setActiveInstitution(institution_id, membership.role)
  redirect("/dashboard")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete("active_institution_id")
  cookieStore.delete("active_role")
  redirect("/login")
}

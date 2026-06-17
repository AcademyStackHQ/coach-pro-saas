import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/server"

// Mirrors setActiveInstitution in app/(auth)/login/actions.ts.
const ACTIVE_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  // Where to send the user when we can't resolve a single active institution
  // for them. Only same-origin relative paths are honoured so the callback
  // can't be turned into an open redirect via a crafted `next` value.
  const nextParam = searchParams.get("next")
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/login"

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  const supabase = await createClient()
  const { data: exchange, error } =
    await supabase.auth.exchangeCodeForSession(code)

  if (error || !exchange.user) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  // The session is now established (e.g. just-confirmed institution admin).
  // Resolve their real memberships and set the active-institution cookie so we
  // can drop them straight into the app instead of bouncing to a second manual
  // login. This ALSO overwrites/clears any stale `active_institution_id` cookie
  // left from a previous account — without it, a mismatched cookie traps the
  // user in a /login ⇄ /dashboard redirect loop (dashboard can't read the
  // cookie's institution under RLS, so it sends them back to /login, which the
  // proxy bounces straight back to /dashboard).
  const { data: memberships } = await supabase
    .from("institution_members")
    .select("institution_id, role")
    .eq("user_id", exchange.user.id)
    .eq("status", "active")

  const active = memberships ?? []
  const cookieStore = await cookies()

  // Exactly one institution → set it active and go to the app. (The dashboard
  // layout routes a first-time admin on to /onboarding from there.)
  if (active.length === 1) {
    cookieStore.set(
      "active_institution_id",
      active[0].institution_id,
      ACTIVE_COOKIE_OPTS
    )
    cookieStore.set("active_role", active[0].role, ACTIVE_COOKIE_OPTS)
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Zero or multiple institutions → clear any stale active cookie so the proxy
  // doesn't ping-pong, then fall back: no memberships go to /no-access, while a
  // multi-institution user picks one via the login form.
  cookieStore.delete({ name: "active_institution_id", path: "/" })
  cookieStore.delete({ name: "active_role", path: "/" })
  return NextResponse.redirect(
    `${origin}${active.length === 0 ? "/no-access" : next}`
  )
}

import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes accessible without any authentication
const PUBLIC_PATHS = new Set(["/login", "/register", "/signup"])

// Routes that need a valid auth session but NOT an active institution cookie
// (user is logged in but was redirected here because they have no institutions)
const AUTH_ONLY_PATHS = new Set(["/no-access"])

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // With Fluid compute, always create a new client per request — never cache globally.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: No code between createServerClient and getClaims().
  // Any code here can cause users to be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const { pathname } = request.nextUrl

  // Copies any Supabase session cookies onto a redirect response so the
  // browser doesn't lose the refreshed token mid-redirect.
  function redirectTo(to: string): NextResponse {
    const url = request.nextUrl.clone()
    url.pathname = to
    const res = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) =>
      res.cookies.set(name, value, rest)
    )
    return res
  }

  // Supabase auth callbacks must pass through unauthenticated — the route
  // handler exchanges the code for a session before any redirect happens.
  if (pathname.startsWith("/auth/")) return supabaseResponse

  const isPublicAuthRoute = PUBLIC_PATHS.has(pathname)
  const isAuthOnlyRoute = AUTH_ONLY_PATHS.has(pathname)
  // The app itself lives under /dashboard and /onboarding. Everything else
  // (the marketing site at /, /features, /pricing, …) is public by default —
  // only these routes require a session, so we never accidentally gate marketing pages.
  const isAppRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/")
  const requiresAuth = isAppRoute || isAuthOnlyRoute

  // ── Unauthenticated ──────────────────────────────────────────────────────
  if (!user) {
    // Protected routes force login; marketing + auth pages pass through.
    if (requiresAuth) return redirectTo("/login")
    return supabaseResponse
  }

  // ── Authenticated ────────────────────────────────────────────────────────

  const institutionId = request.cookies.get("active_institution_id")?.value

  // Bounce logged-in users away from auth pages — but only once they have an
  // active institution. Without the cookie a multi-institution user is still
  // mid-selection on /login; bouncing them to /dashboard would ping-pong
  // forever (dashboard needs the cookie and sends them back to /login).
  if (isPublicAuthRoute && institutionId) return redirectTo("/dashboard")

  // App routes need an active institution cookie; /no-access intentionally
  // does not (it's where a user with zero institutions lands).
  if (isAppRoute && !institutionId) return redirectTo("/login")

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}

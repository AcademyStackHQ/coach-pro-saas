import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/middleware"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/coach/:path*",
    "/students/:path*",
    "/coaches/:path*",
    "/batches/:path*",
    "/calendar/:path*",
    "/fees/:path*",
    "/settings/:path*",
  ],
}

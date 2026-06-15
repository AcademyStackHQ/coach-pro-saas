"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/server"
import { z } from "zod"

const ForgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
})

export type ForgotState = {
  error?: string | null
  success?: boolean
}

export async function requestPasswordReset(
  prevState: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const validated = ForgotSchema.safeParse({ email: formData.get("email") })

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors.email?.[0] }
  }

  const supabase = await createClient()
  const h = await headers()
  const origin = h.get("origin") ?? `https://${h.get("host")}`

  // The recovery link lands on /auth/callback, which exchanges the code for a
  // session and then forwards to /reset-password to set a new password.
  await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  // Always report success — never reveal whether an email has an account.
  return { success: true }
}

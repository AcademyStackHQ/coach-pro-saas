"use server"

import { createClient } from "@/lib/server"
import { z } from "zod"

const ResetSchema = z.object({
  password: z.string().min(8, "Must be at least 8 characters"),
})

export type ResetState = {
  error?: string | null
  success?: boolean
}

export async function updatePassword(
  prevState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirm_password") as string

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  const validated = ResetSchema.safeParse({ password })
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors.password?.[0] }
  }

  const supabase = await createClient()

  // The recovery link must have established a session via /auth/callback.
  // Without one there's nothing to update — the link was never used or expired.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: "Your reset link is invalid or has expired. Request a new one.",
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: validated.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  // Drop the recovery session so the user signs in fresh with the new password
  // (this also triggers the normal institution-selection flow on login).
  await supabase.auth.signOut()

  return { success: true }
}

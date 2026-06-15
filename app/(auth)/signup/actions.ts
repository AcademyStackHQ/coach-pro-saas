"use server"

import { createClient } from "@/lib/server"
import { z } from "zod"

const SignupSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Must be at least 8 characters"),
})

export type SignupState = {
  errors?: {
    full_name?: string[]
    email?: string[]
    password?: string[]
  }
  message?: string | null
  success?: boolean
}

export async function signUpStudent(
  prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const validated = SignupSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { full_name, email, password } = validated.data
  const supabase = await createClient()

  // Block signup if the email hasn't been pre-approved by any institution admin.
  // Uses a SECURITY DEFINER RPC to bypass RLS (unauthenticated users can't query
  // institution_allowed_emails directly).
  const { data: isAllowed, error: checkError } = await supabase.rpc(
    "is_email_allowed",
    { p_email: email }
  )

  if (checkError) {
    return { message: "Something went wrong. Please try again." }
  }

  if (!isAllowed) {
    return {
      message:
        "Your email hasn't been added to any institution yet. Contact your institution admin to get you added first.",
    }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        signup_type: "student",
        full_name,
      },
    },
  })

  if (error) {
    if (error.code === "user_already_exists") {
      return {
        message:
          "An account with this email already exists. Please sign in instead.",
      }
    }
    return { message: error.message }
  }

  return { success: true }
}

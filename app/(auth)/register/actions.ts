"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/server"
import { z } from "zod"

const RegisterSchema = z.object({
  institution_name: z.string().min(2, "Must be at least 2 characters"),
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Must be at least 8 characters"),
  mobile: z.string().min(7, "Enter a valid mobile number"),
  category: z.string().min(1, "Please select a category"),
})

export type RegisterState = {
  errors?: {
    institution_name?: string[]
    full_name?: string[]
    email?: string[]
    password?: string[]
    mobile?: string[]
    category?: string[]
  }
  message?: string | null
  success?: boolean
  // The auto-generated academy code (e.g. "MVA"), shown on the success screen.
  institutionCode?: string
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export async function registerInstitution(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const validated = RegisterSchema.safeParse({
    institution_name: formData.get("institution_name"),
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    mobile: formData.get("mobile"),
    category: formData.get("category"),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { institution_name, full_name, email, password, mobile, category } =
    validated.data
  const slug = toSlug(institution_name)

  const supabase = await createClient()
  const origin = (await headers()).get("origin")

  // Server-side guard against a duplicate academy name. The client previews
  // availability, but that's a TOCTOU hint only — re-check here so a taken name
  // returns a clean field error instead of an opaque "Database error saving new
  // user" bubbling up from the signup trigger's unique-violation.
  const { data: nameAvailable } = await supabase.rpc(
    "is_institution_name_available",
    { p_name: institution_name }
  )
  if (nameAvailable === false) {
    return {
      errors: { institution_name: ["That academy name is already taken."] },
    }
  }

  // Preview the academy code now (SECURITY DEFINER RPC, callable pre-auth) so we
  // can both show it on the success screen and pass it to the signup trigger.
  // TODO(types): drop the cast once migration 008 is applied + types regenerated.
  const { data: institutionCode } = await (supabase.rpc as any)(
    "generate_institution_code",
    { p_name: institution_name }
  )

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/login`,
      data: {
        signup_type: "institution_admin",
        institution_name,
        institution_slug: slug,
        institution_code: institutionCode ?? undefined,
        full_name,
        mobile,
        category,
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

  return {
    success: true,
    institutionCode: (institutionCode as string | null) ?? undefined,
  }
}

export async function checkInstitutionName(name: string): Promise<boolean> {
  if (name.trim().length < 2) return false
  const supabase = await createClient()
  // RLS hides the institutions table from unauthenticated callers, so a direct
  // SELECT here would always return zero rows and report every name as available.
  // This SECURITY DEFINER RPC bypasses RLS and returns only a boolean.
  const { data, error } = await supabase.rpc("is_institution_name_available", {
    p_name: name,
  })
  if (error) return false
  return data === true
}

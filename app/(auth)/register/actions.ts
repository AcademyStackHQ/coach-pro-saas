"use server"

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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        signup_type: "institution_admin",
        institution_name,
        institution_slug: slug,
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

  return { success: true }
}

export async function checkInstitutionName(name: string): Promise<boolean> {
  if (name.trim().length < 2) return false
  const supabase = await createClient()
  const { data } = await supabase
    .from("institutions")
    .select("id")
    .ilike("name", name.trim())
    .maybeSingle()
  return data === null
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { STUDENT_LOGIN_EMAIL_DOMAIN } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Maps a student code to its synthetic Supabase Auth email. Single source of
// truth shared by enable-login (creates the auth user) and login (resolves the
// code a student types). Lowercased to match Supabase's email normalisation.
export function studentLoginEmail(code: string): string {
  return `${code.trim().toLowerCase()}@${STUDENT_LOGIN_EMAIL_DOMAIN}`
}

// Student logins are guarded only by their password: the username is the
// student code, which is sequential and printable, so it's effectively public
// and enumerable. Require more than length — a letter and a digit, and never
// the code itself — to blunt credential-stuffing against predictable handles.
// Returns an error message, or null when the password is acceptable.
export function studentPasswordError(
  password: string,
  studentCode?: string | null
): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    return 'Password must include at least one letter and one number.'
  if (studentCode && password.toLowerCase().includes(studentCode.toLowerCase()))
    return 'Password must not contain the student code.'
  return null
}

// Money is stored in PAISE (1 INR = 100 paise), never floats. Forms capture
// rupees; convert at the boundary.
export function rupeesToPaise(value: FormDataEntryValue | string | null): number | null {
  const s = typeof value === 'string' ? value.trim() : ''
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export function paiseToRupees(paise: number | null | undefined): string {
  if (paise == null) return ''
  return (paise / 100).toString()
}

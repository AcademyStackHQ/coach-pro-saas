import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

"use client"

import { useActionState, useRef, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  checkInstitutionName,
  registerInstitution,
  type RegisterState,
} from "./actions"

const CATEGORIES = [
  { value: "sports-academy", label: "Sports Academy" },
  { value: "tuition-centre", label: "Tuition Centre" },
  { value: "school", label: "School" },
  { value: "dance-academy", label: "Dance Academy" },
  { value: "music-academy", label: "Music Academy" },
  { value: "martial-arts", label: "Martial Arts" },
  { value: "art-and-craft", label: "Art & Craft" },
  { value: "language-institute", label: "Language Institute" },
  { value: "yoga-and-wellness", label: "Yoga & Wellness" },
  { value: "gym-and-fitness", label: "Gym & Fitness" },
  { value: "other", label: "Other" },
]

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

const initialState: RegisterState = {}

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(
    registerInstitution,
    initialState
  )
  const [slug, setSlug] = useState("")
  const [nameStatus, setNameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSlug(toSlug(value))
    setNameStatus("idle")

    if (timerRef.current) clearTimeout(timerRef.current)
    if (value.trim().length < 2) return

    timerRef.current = setTimeout(async () => {
      setNameStatus("checking")
      const available = await checkInstitutionName(value)
      setNameStatus(available ? "available" : "taken")
    }, 600)
  }

  if (state.success) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="mb-2 size-12 text-green-500" />
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a confirmation link to your email. Click it to
            activate your institution account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.institutionCode && (
            <div className="rounded-lg border bg-muted/40 p-4 text-center">
              <p className="text-xs text-muted-foreground">Your academy code</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest">
                {state.institutionCode}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Every student&apos;s login code starts with this — e.g.{" "}
                <span className="font-mono">{state.institutionCode}0001</span>.
              </p>
            </div>
          )}
          <div className="flex justify-center">
            <Link
              href="/login"
              className="text-sm text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register your institution</CardTitle>
        <CardDescription>
          Set up your academy on CoachPro. Free to start, no card required.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.message && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </div>
          )}

          {/* Institution Name */}
          <div className="space-y-1.5">
            <Label htmlFor="institution_name">Institution Name</Label>
            <div className="relative">
              <Input
                id="institution_name"
                name="institution_name"
                placeholder="e.g. NLCA Academy"
                required
                onChange={handleNameChange}
                aria-invalid={!!state.errors?.institution_name}
              />
              {nameStatus === "checking" && (
                <Loader2 className="absolute right-2.5 top-2 size-4 animate-spin text-muted-foreground" />
              )}
              {nameStatus === "available" && (
                <CheckCircle2 className="absolute right-2.5 top-2 size-4 text-green-500" />
              )}
              {nameStatus === "taken" && (
                <XCircle className="absolute right-2.5 top-2 size-4 text-destructive" />
              )}
            </div>
            {nameStatus === "taken" && (
              <p className="text-xs text-destructive">
                This institution name is already taken.
              </p>
            )}
            {nameStatus === "available" && (
              <p className="text-xs text-green-600">Name is available.</p>
            )}
            {slug && nameStatus !== "taken" && (
              <p className="text-xs text-muted-foreground">
                Slug:{" "}
                <span className="font-mono text-foreground">{slug}</span>
              </p>
            )}
            {state.errors?.institution_name && (
              <p className="text-xs text-destructive">
                {state.errors.institution_name[0]}
              </p>
            )}
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Your Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="e.g. Vinoth devaraj"
              required
              aria-invalid={!!state.errors?.full_name}
            />
            {state.errors?.full_name && (
              <p className="text-xs text-destructive">
                {state.errors.full_name[0]}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Work Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@academy.com"
              required
              aria-invalid={!!state.errors?.email}
            />
            {state.errors?.email && (
              <p className="text-xs text-destructive">
                {state.errors.email[0]}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              required
              aria-invalid={!!state.errors?.password}
            />
            {state.errors?.password && (
              <p className="text-xs text-destructive">
                {state.errors.password[0]}
              </p>
            )}
          </div>

          {/* Mobile */}
          <div className="space-y-1.5">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              name="mobile"
              type="tel"
              placeholder="+91 98765 43210"
              required
              aria-invalid={!!state.errors?.mobile}
            />
            {state.errors?.mobile && (
              <p className="text-xs text-destructive">
                {state.errors.mobile[0]}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Institution Type</Label>
            <select
              id="category"
              name="category"
              required
              defaultValue=""
              aria-invalid={!!state.errors?.category}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
            >
              <option value="" disabled>
                Select institution type
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {state.errors?.category && (
              <p className="text-xs text-destructive">
                {state.errors.category[0]}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full mt-2"
            disabled={pending || nameStatus === "taken"}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating your institution…
              </>
            ) : (
              "Create institution"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </form>
    </Card>
  )
}

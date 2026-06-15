"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import {
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react"
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
  loginUser,
  selectInstitution,
  type LoginState,
} from "./actions"

const initialState: LoginState = {}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  student: "Student",
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginUser, initialState)
  const [showPassword, setShowPassword] = useState(false)

  if (state.institutions && state.institutions.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose your institution</CardTitle>
          <CardDescription>
            You belong to multiple institutions. Select one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {state.institutions.map((inst) => (
            <form key={inst.institution_id} action={selectInstitution}>
              <input
                type="hidden"
                name="institution_id"
                value={inst.institution_id}
              />
              <input type="hidden" name="role" value={inst.role} />
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg border p-3.5 text-left transition-colors hover:bg-muted"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {inst.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[inst.role] ?? inst.role}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </form>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your CoachPro account</CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@academy.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="mt-2 w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>

          <div className="space-y-1 text-center text-sm text-muted-foreground">
            <p>
              Student or coach?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Create your account
              </Link>
            </p>
            <p>
              Setting up an institution?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </CardContent>
      </form>
    </Card>
  )
}

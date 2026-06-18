'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { changeMyPassword, type PasswordActionState } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function PasswordInput({
  id,
  name,
  placeholder,
  autoComplete,
}: {
  id: string
  name: string
  placeholder?: string
  autoComplete: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function AccountClient() {
  const [state, action, pending] = useActionState<PasswordActionState, FormData>(
    changeMyPassword,
    {}
  )

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your sign-in credentials.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          {/* key on success resets the inputs after a successful change */}
          <form
            key={state.success ? 'done' : 'form'}
            action={action}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Current password</Label>
              <PasswordInput
                id="current_password"
                name="current_password"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new_password">New password</Label>
              <PasswordInput
                id="new_password"
                name="new_password"
                placeholder="Min 8 chars, with a letter and a number"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <PasswordInput
                id="confirm_password"
                name="confirm_password"
                autoComplete="new-password"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  state.error ? 'text-destructive' : 'text-green-600'
                )}
              >
                {state.error
                  ? state.error
                  : state.success
                    ? 'Password updated.'
                    : ''}
              </span>
              <Button type="submit" disabled={pending} className="ml-auto">
                {pending ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

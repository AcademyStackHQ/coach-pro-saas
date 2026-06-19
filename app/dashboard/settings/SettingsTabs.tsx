'use client'

import { useActionState, useState } from 'react'
import {
  updateAcademyProfile,
  updateWorkingHours,
  updateFeeConfig,
  type ActionState,
} from './actions'
import {
  updateSmsTemplate,
  type ActionState as SmsActionState,
} from '../sms/actions'
import { resolveTemplate, SAMPLE_TOKENS } from '@/lib/messaging/tokens'
import {
  INSTITUTION_CATEGORIES,
  DAYS,
  DEFAULT_WORKING_HOURS,
  FREE_PLAN_LIMITS,
  type DayKey,
  type WorkingHoursMap,
} from '@/lib/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export type SettingsData = {
  id: string
  name: string
  slug: string
  code: string | null
  category: string | null
  address: string | null
  contact_email: string | null
  contact_mobile: string | null
  timezone: string | null
  working_hours: Record<string, unknown> | null
  fee_config: Record<string, unknown> | null
  plan: string | null
  sms_credits: number | null
  student_count: number
  coach_count: number
  smsTemplates: { name: string; body: string }[]
  smsLogs: {
    id: string
    studentName: string | null
    mobile: string
    message: string
    status: string
    channel: string
    sentAt: string
  }[]
}

const TABS = [
  { id: 'profile',   label: 'Academy Profile' },
  { id: 'hours',     label: 'Working Hours' },
  { id: 'fees',      label: 'Fee Settings' },
  { id: 'sms',       label: 'SMS Settings' },
  { id: 'plan',      label: 'Subscription' },
] as const

type TabId = (typeof TABS)[number]['id']

function nativeSelectClass() {
  return 'w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring'
}

function SaveFeedback({ state }: { state: ActionState }) {
  if (state.success)
    return <p className="text-sm text-green-600 font-medium">Saved successfully.</p>
  if (state.error)
    return <p className="text-sm text-destructive">{state.error}</p>
  return null
}

function ProfileTab({ data, state, action, pending }: {
  data: SettingsData
  state: ActionState
  action: (payload: FormData) => void
  pending: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Academy Profile</CardTitle>
        <CardDescription>Public-facing details about your academy.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p_name">Academy Name</Label>
              <Input id="p_name" name="name" defaultValue={data.name} required minLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p_slug">Slug</Label>
              <Input id="p_slug" value={data.slug} disabled className="bg-muted/50 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">Slug cannot be changed after creation.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p_code">Academy Code</Label>
            <Input
              id="p_code"
              value={data.code ?? '—'}
              disabled
              className="bg-muted/50 cursor-not-allowed font-mono tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              Prefixes every student&apos;s login code (e.g.{' '}
              <span className="font-mono">{data.code ?? 'XXX'}0001</span>). Fixed
              after creation.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p_category">Category</Label>
            <select
              id="p_category"
              name="category"
              defaultValue={data.category ?? ''}
              className={nativeSelectClass()}
            >
              <option value="">Not specified</option>
              {INSTITUTION_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p_address">Address</Label>
            <textarea
              id="p_address"
              name="address"
              rows={3}
              defaultValue={data.address ?? ''}
              placeholder="Full address"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p_email">Contact Email</Label>
              <Input id="p_email" name="contact_email" type="email" defaultValue={data.contact_email ?? ''} placeholder="academy@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p_mobile">Contact Mobile</Label>
              <Input id="p_mobile" name="contact_mobile" type="tel" defaultValue={data.contact_mobile ?? ''} placeholder="+91 98765 43210" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <SaveFeedback state={state} />
            <Button type="submit" disabled={pending} className="ml-auto">
              {pending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function HoursTab({ data, state, action, pending }: {
  data: SettingsData
  state: ActionState
  action: (payload: FormData) => void
  pending: boolean
}) {
  const [hours, setHours] = useState<WorkingHoursMap>(() => {
    const wh = data.working_hours
    if (wh && typeof wh === 'object' && 'mon' in wh) {
      return { ...DEFAULT_WORKING_HOURS, ...(wh as Partial<WorkingHoursMap>) }
    }
    return DEFAULT_WORKING_HOURS
  })

  function toggleDay(day: DayKey) {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], open: !prev[day].open } }))
  }

  function setTime(day: DayKey, field: 'start' | 'end', value: string) {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Hours</CardTitle>
        <CardDescription>Set when your academy is open for business.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="working_hours" value={JSON.stringify(hours)} />

          <div className="divide-y">
            {DAYS.map(d => (
              <div key={d.key} className="flex items-center gap-4 py-3">
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <input
                    type="checkbox"
                    id={`h-${d.key}`}
                    checked={hours[d.key]?.open ?? false}
                    onChange={() => toggleDay(d.key)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                  />
                  <Label htmlFor={`h-${d.key}`} className="font-normal cursor-pointer">
                    {d.label}
                  </Label>
                </div>

                {hours[d.key]?.open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={hours[d.key]?.start ?? '06:00'}
                      onChange={e => setTime(d.key, 'start', e.target.value)}
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <input
                      type="time"
                      value={hours[d.key]?.end ?? '21:00'}
                      onChange={e => setTime(d.key, 'end', e.target.value)}
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <SaveFeedback state={state} />
            <Button type="submit" disabled={pending} className="ml-auto">
              {pending ? 'Saving…' : 'Save Hours'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function FeesTab({ data, state, action, pending }: {
  data: SettingsData
  state: ActionState
  action: (payload: FormData) => void
  pending: boolean
}) {
  const cfg = (data.fee_config ?? {}) as Record<string, unknown>
  const lateFeeEnabled = (cfg.late_fee_enabled as boolean) ?? false
  const lateFeeAmount = ((cfg.late_fee_amount as number) ?? 0) / 100 // paise → rupees
  const gracePeriod = (cfg.grace_period_days as number) ?? 5
  const receiptPrefix = (cfg.receipt_prefix as string) ?? 'RCP'

  const [lateEnabled, setLateEnabled] = useState(lateFeeEnabled)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Settings</CardTitle>
        <CardDescription>
          Default settings applied when creating fee records. Module 7 configures individual fee plans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                defaultValue={(cfg.currency as string) ?? 'INR'}
                className={nativeSelectClass()}
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="SGD">SGD — Singapore Dollar</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt_prefix">Receipt Prefix</Label>
              <Input
                id="receipt_prefix"
                name="receipt_prefix"
                defaultValue={receiptPrefix}
                placeholder="RCP"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">e.g. RCP-001, INV-001</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="late_fee_enabled"
                name="late_fee_enabled"
                checked={lateEnabled}
                onChange={e => setLateEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
              />
              <Label htmlFor="late_fee_enabled" className="font-normal cursor-pointer">
                Enable late fee charge
              </Label>
            </div>

            {lateEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
                <div className="space-y-1.5">
                  <Label htmlFor="late_fee_amount">Late Fee Amount (₹)</Label>
                  <Input
                    id="late_fee_amount"
                    name="late_fee_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={lateFeeAmount}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="grace_period_days">Grace Period (days)</Label>
                  <Input
                    id="grace_period_days"
                    name="grace_period_days"
                    type="number"
                    min="0"
                    max="30"
                    defaultValue={gracePeriod}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">Days before late fee kicks in.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <SaveFeedback state={state} />
            <Button type="submit" disabled={pending} className="ml-auto">
              {pending ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

const SMS_TOKENS = [
  'parent_name',
  'student_name',
  'batch_name',
  'month',
  'amount_due',
  'amount_paid',
  'due_date',
  'payment_date',
  'receipt_number',
  'academy_name',
] as const

function TemplateEditor({ name, body }: { name: string; body: string }) {
  const [state, action, pending] = useActionState<SmsActionState, FormData>(
    updateSmsTemplate,
    {}
  )
  const [text, setText] = useState(body)

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium font-mono">{name}</p>
        <span className="text-xs text-muted-foreground">{text.length} chars</span>
      </div>
      <form action={action} className="space-y-3">
        <input type="hidden" name="name" value={name} />
        <textarea
          name="body"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-1">
          {SMS_TOKENS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setText((prev) => `${prev}{${t}}`)}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted/70"
            >
              {`{${t}}`}
            </button>
          ))}
        </div>
        <div className="rounded-md bg-muted/40 p-2 text-xs">
          <span className="text-muted-foreground">Preview: </span>
          {resolveTemplate(text, SAMPLE_TOKENS)}
        </div>
        <div className="flex items-center justify-between">
          <SaveFeedback state={state} />
          <Button type="submit" size="sm" disabled={pending} className="ml-auto">
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}

const LOG_BADGE: Record<string, string> = {
  sent: 'bg-amber-50 text-amber-700',
  delivered: 'bg-green-50 text-green-700',
  failed: 'bg-destructive/10 text-destructive',
}

function SmsTab({ data }: { data: SettingsData }) {
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'delivered' | 'failed'>('all')
  const credits = data.sms_credits ?? 0
  const lowCredit = credits <= 20

  const logs =
    logFilter === 'all' ? data.smsLogs : data.smsLogs.filter((l) => l.status === logFilter)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SMS Settings</CardTitle>
          <CardDescription>
            Credits are deducted per message sent. Set{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">SMS_GATEWAY=msg91</code>{' '}
            (+ MSG91 keys) to send live; unset uses a dev no-op gateway.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">Available Credits</p>
              <p className="text-3xl font-bold mt-0.5">{credits}</p>
            </div>
          </div>
          {lowCredit && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Low SMS credits ({credits}). Top up to keep sending reminders.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message Templates</CardTitle>
          <CardDescription>
            Edit the message bodies. Tap a token to insert it; the preview uses sample data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.smsTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : (
            data.smsTemplates.map((t) => (
              <TemplateEditor key={t.name} name={t.name} body={t.body} />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SMS Log</CardTitle>
          <CardDescription>The 100 most recent messages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1 rounded-md border p-0.5 text-sm">
            {(['all', 'sent', 'delivered', 'failed'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setLogFilter(f)}
                className={cn(
                  'rounded px-3 py-1 font-medium capitalize transition-colors',
                  logFilter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>
          {logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No messages.</p>
          ) : (
            <ul className="divide-y">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {l.studentName ?? '—'}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {l.mobile}
                      </span>
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase text-muted-foreground">
                        {l.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {l.message}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                        LOG_BADGE[l.status] ?? 'bg-muted text-muted-foreground'
                      )}
                    >
                      {l.status}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {l.sentAt.slice(0, 10)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PlanTab({ data }: { data: SettingsData }) {
  const isPro = data.plan === 'pro' || data.plan === 'enterprise'
  const planLabel = data.plan === 'enterprise' ? 'Enterprise' : data.plan === 'pro' ? 'Pro' : 'Free'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Your current plan and usage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <Badge variant={isPro ? 'default' : 'secondary'} className="text-sm px-3 py-1">
            {planLabel}
          </Badge>
          {!isPro && (
            <p className="text-sm text-muted-foreground">
              Upgrade to Pro to remove limits and unlock all features.
            </p>
          )}
        </div>

        {!isPro && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium">Free Plan Usage</p>
              <UsageBar label="Students" used={data.student_count} max={FREE_PLAN_LIMITS.student} />
              <UsageBar label="Coaches" used={data.coach_count} max={FREE_PLAN_LIMITS.coach} />
              <UsageBar label="Batches" used={0} max={FREE_PLAN_LIMITS.batch} />
            </div>

            <Separator />

            <div>
              <Button disabled className="w-full sm:w-auto">
                Upgrade to Pro — coming soon
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / max) * 100))
  const critical = pct >= 90
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium', critical ? 'text-destructive' : '')}>
          {used} / {max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', critical ? 'bg-destructive' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function SettingsTabs({ data }: { data: SettingsData }) {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const [ps, pa, pp] = useActionState<ActionState, FormData>(updateAcademyProfile, {})
  const [hs, ha, hp] = useActionState<ActionState, FormData>(updateWorkingHours, {})
  const [fs, fa, fp] = useActionState<ActionState, FormData>(updateFeeConfig, {})

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b overflow-x-auto pb-px">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <ProfileTab data={data} state={ps} action={pa} pending={pp} />
      )}
      {activeTab === 'hours' && (
        <HoursTab data={data} state={hs} action={ha} pending={hp} />
      )}
      {activeTab === 'fees' && (
        <FeesTab data={data} state={fs} action={fa} pending={fp} />
      )}
      {activeTab === 'sms' && <SmsTab data={data} />}
      {activeTab === 'plan' && <PlanTab data={data} />}
    </div>
  )
}

/**
 * Notification seam — SERVER ONLY.
 *
 * One place to fan a domain event out to whatever channels (SMS, email,
 * push, …) are configured. Today NO provider is wired, so `notify()` is a safe
 * no-op: it logs in dev and returns. Lighting up a real channel later is purely
 * additive and touches NO call site:
 *   1. add the event to `NotifyEvent` (the compiler then forces a template in
 *      `renderMessage`),
 *   2. implement a `NotifyProvider` for the channel,
 *   3. register it in `resolveProviders()` behind its own env var.
 *
 * Delivery is ALWAYS best-effort: `notify()` never throws and never blocks the
 * caller's result, so an absent or failing notification can't break the core
 * action that triggered it (enabling a login, resetting a password, …).
 */

// ---------------------------------------------------------------------------
// Event model — the contract every call site speaks.
// ---------------------------------------------------------------------------

export type NotifyChannel = 'sms' | 'email'

// Who to reach. Channels pick the field(s) they need; a recipient may be
// reachable on some channels and not others.
export interface NotifyRecipient {
  name?: string | null
  mobile?: string | null
  email?: string | null
  /** Honour the student's SMS opt-in. Undefined = treated as opted in. */
  smsOptIn?: boolean
}

// Every notifiable event, as a discriminated union. Add a case here and the
// switch in `renderMessage` fails to compile until it's handled — so a new
// event can never silently ship without a message.
export type NotifyEvent =
  | {
      type: 'student.login_enabled'
      studentName: string
      studentCode: string
      institutionName?: string | null
    }
  | {
      type: 'student.password_reset'
      studentName: string
      studentCode: string
      institutionName?: string | null
    }

// ---------------------------------------------------------------------------
// Templates — pure `event -> message`. Channel-agnostic; `subject` is used by
// email-like channels and ignored by SMS.
// ---------------------------------------------------------------------------

export interface NotifyMessage {
  subject?: string
  body: string
}

export function renderMessage(event: NotifyEvent): NotifyMessage {
  switch (event.type) {
    case 'student.login_enabled': {
      const where = event.institutionName ? ` at ${event.institutionName}` : ''
      return {
        subject: `Login ready for ${event.studentName}`,
        body:
          `Login for ${event.studentName}${where} is now ready. ` +
          `Sign in with student code ${event.studentCode} and the password shared by the academy.`,
      }
    }
    case 'student.password_reset': {
      const where = event.institutionName ? ` for ${event.institutionName}` : ''
      return {
        subject: `Password reset for ${event.studentName}`,
        body:
          `The password for ${event.studentName}'s login${where} was reset. ` +
          `Sign in with student code ${event.studentCode} and the new password shared by the academy.`,
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Channels / providers — delivery. Implement one of these per channel.
// ---------------------------------------------------------------------------

export interface NotifyProvider {
  readonly channel: NotifyChannel
  send(recipient: NotifyRecipient, message: NotifyMessage): Promise<void>
}

// The active providers, resolved from env so deployments opt in by setting
// keys — no code change to enable/disable a channel. Empty today: drop a
// provider in here to go live, e.g.
//
//   if (process.env.TWILIO_AUTH_TOKEN) providers.push(createTwilioSmsProvider())
//
function resolveProviders(): NotifyProvider[] {
  const providers: NotifyProvider[] = []
  return providers
}

// Can this recipient receive on this channel right now? Keeps opt-in / missing
// contact checks in one spot so every provider gets them for free.
function canReceive(channel: NotifyChannel, r: NotifyRecipient): boolean {
  switch (channel) {
    case 'sms':
      return !!r.mobile && r.smsOptIn !== false
    case 'email':
      return !!r.email
  }
}

// ---------------------------------------------------------------------------
// Dispatch — the only entry point call sites use.
// ---------------------------------------------------------------------------

export async function notify(
  event: NotifyEvent,
  recipient: NotifyRecipient
): Promise<void> {
  try {
    const providers = resolveProviders()

    if (providers.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[notify] no provider configured — skipping ${event.type}`)
      }
      return
    }

    const message = renderMessage(event)

    // Fan out across eligible channels. One channel failing must not stop the
    // others, so each send is isolated and only logged on error.
    await Promise.all(
      providers
        .filter((p) => canReceive(p.channel, recipient))
        .map(async (p) => {
          try {
            await p.send(recipient, message)
          } catch (err) {
            console.error(`[notify] ${p.channel} failed for ${event.type}`, err)
          }
        })
    )
  } catch (err) {
    // Best-effort: never let the notification layer surface into the caller.
    console.error(`[notify] dispatch failed for ${event.type}`, err)
  }
}

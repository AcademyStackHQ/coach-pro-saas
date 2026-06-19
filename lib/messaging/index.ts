/**
 * Messaging layer — SERVER ONLY. Channel- and provider-aware, env-selected,
 * best-effort (mirrors lib/email.ts). No new runtime dependency.
 *
 * A student's `contact_channel` preference (sms | whatsapp | both) drives which
 * channels a message goes out on. Each channel resolves a PROVIDER from env,
 * defaulting to a `mock` that logs and sends nothing — so dev/test never sends a
 * real message or needs an account. Wiring a real vendor (MSG91 / Meta / Twilio)
 * is a one-line registry entry below; no call site changes.
 *
 *   SMS_PROVIDER=msg91        → real SMS via that provider
 *   WHATSAPP_PROVIDER=meta    → real WhatsApp via that provider
 *   (unset)                   → mock (default)
 */

import { mockProvider } from './providers/mock'

export type Channel = 'sms' | 'whatsapp'
export type ContactChannel = 'sms' | 'whatsapp' | 'both' | 'none'

export type MessageResult = { ok: true; ref: string } | { ok: false; error: string }

export interface MessageProvider {
  send(channel: Channel, to: string, body: string): Promise<MessageResult>
}

// Resolve the provider for a channel. Add a real one by implementing
// MessageProvider and returning it from a new case — nothing else changes.
function providerFor(channel: Channel): MessageProvider {
  const name = channel === 'whatsapp' ? process.env.WHATSAPP_PROVIDER : process.env.SMS_PROVIDER
  switch (name) {
    // case 'msg91': return msg91Provider
    // case 'meta': return metaProvider
    // case 'twilio': return twilioProvider
    default:
      return mockProvider
  }
}

export async function sendMessage(
  channel: Channel,
  to: string,
  body: string
): Promise<MessageResult> {
  return providerFor(channel).send(channel, to, body)
}

/** Expand a student's preference into the concrete channels to send on. */
export function channelsFor(pref: ContactChannel): Channel[] {
  if (pref === 'none') return []
  return pref === 'both' ? ['sms', 'whatsapp'] : [pref]
}

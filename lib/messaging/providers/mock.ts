import type { Channel, MessageProvider, MessageResult } from '../index'

/**
 * Dev/test provider for ANY channel: logs the resolved message and returns a
 * fake ref. Never touches the network, so no real SMS/WhatsApp is sent. This is
 * the default until a real provider is configured via env.
 */
export const mockProvider: MessageProvider = {
  async send(channel: Channel, to: string, body: string): Promise<MessageResult> {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[msg:mock:${channel}] → ${to}: ${body}`)
    }
    return { ok: true, ref: `mock-${channel}-${Math.random().toString(36).slice(2, 10)}` }
  },
}

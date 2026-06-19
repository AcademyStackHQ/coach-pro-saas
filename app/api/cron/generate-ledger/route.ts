// Monthly fee-ledger generation endpoint.
//
// Triggered by Vercel Cron (a GET request) on the 1st of each month; also
// callable manually via POST for testing. Auth: Vercel automatically adds an
// `Authorization: Bearer <CRON_SECRET>` header when CRON_SECRET is set, so we
// reject anything that doesn't match.
//
// Runs with the service-role client (no user session in a cron context) and is
// idempotent — generateLedger() skips students that already have an invoice for
// the month, so a daily Hobby-tier schedule is harmless.

import { createAdminClient } from '@/lib/admin'
import { generateLedger, firstOfMonth } from '@/lib/fees'
import { today } from '@/lib/calendar'

export const dynamic = 'force-dynamic'

async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: institutions, error } = await supabase
    .from('institutions')
    .select('id')
  if (error || !institutions) {
    return Response.json({ error: 'Failed to load institutions.' }, { status: 500 })
  }

  const month = firstOfMonth(today())
  let generated = 0
  for (const inst of institutions) {
    generated += await generateLedger(supabase, inst.id, month)
  }

  return Response.json({ generated, institutions: institutions.length })
}

export const GET = handle
export const POST = handle

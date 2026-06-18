/**
 * Transactional email — SERVER ONLY. Thin wrapper over the Resend REST API
 * (https://resend.com/docs/api-reference/emails/send-email) so we don't take a
 * new runtime dependency. Configure with two env vars:
 *
 *   RESEND_API_KEY  — your Resend API key
 *   EMAIL_FROM      — verified sender, e.g. "CoachPro <invites@yourdomain.com>"
 *
 * Sends are best-effort from the caller's point of view: if email isn't
 * configured or Resend errors, we return { ok: false } and let the caller
 * decide (the coach is already on the allowlist, so it's a warning not a fail).
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export type SendResult = { ok: true } | { ok: false; error: string }

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    return {
      ok: false,
      error: 'Email is not configured (set RESEND_API_KEY and EMAIL_FROM).',
    }
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    })

    if (!res.ok) {
      return { ok: false, error: `Resend responded ${res.status}: ${await res.text()}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown email error.' }
  }
}

/**
 * Invite a coach to sign up. They've been added to the institution allowlist;
 * this tells them to create their account so the signup trigger links them.
 */
export async function sendCoachInviteEmail(opts: {
  to: string
  academyName: string
  signupUrl: string
}): Promise<SendResult> {
  const { to, academyName, signupUrl } = opts
  const subject = `You've been invited to coach at ${academyName}`

  const text = [
    `${academyName} has invited you to join as a coach on CoachPro.`,
    ``,
    `Create your account to get started: ${signupUrl}`,
    ``,
    `Use this email address (${to}) when you sign up — it's already been approved.`,
  ].join('\n')

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#0f172a">
      <p><strong>${academyName}</strong> has invited you to join as a coach on CoachPro.</p>
      <p style="margin:24px 0">
        <a href="${signupUrl}"
           style="background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">
          Create your account
        </a>
      </p>
      <p style="color:#475569;font-size:13px">
        Use this email address (<strong>${to}</strong>) when you sign up — it's already been approved.
        If the button doesn't work, paste this link into your browser:<br>
        <a href="${signupUrl}">${signupUrl}</a>
      </p>
    </div>
  `

  return sendEmail({ to, subject, html, text })
}

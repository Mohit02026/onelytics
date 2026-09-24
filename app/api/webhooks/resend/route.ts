import { Webhook } from 'svix'
import { Resend } from 'resend'

// Resend delivers bounce/delivery/complaint events via a Svix-signed webhook.
// This replaces the old Gmail NDR-scanning cron — Resend pushes events to us
// instead of us polling for them.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Onelytics Reports <reports@info.exchangefour.com>'
const ALERT_TO = 'dev@exchangefour.com'

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export async function POST(req: Request) {
  const payload = await req.text()
  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not configured — rejecting unverifiable webhook')
    return Response.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: unknown
  try {
    event = new Webhook(secret).verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { type, data } = event as { type: string; data: { to?: string[]; email_id?: string; subject?: string } }

  if (type === 'email.bounced' || type === 'email.complained') {
    const to = data.to?.join(', ') ?? 'unknown'
    const subject = data.subject ?? 'unknown'
    const emailId = data.email_id ?? 'unknown'
    console.warn(`[resend-webhook] ${type} — to: ${to}, email_id: ${emailId}, subject: ${subject}`)

    if (resend) {
      const label = type === 'email.bounced' ? 'bounced' : 'was marked as spam'
      await resend.emails.send({
        from: FROM,
        to: [ALERT_TO],
        subject: `Report ${label}: ${to}`,
        html: `<p style="font-family:sans-serif;font-size:14px;color:#1f2937;">A weekly report email ${label}.</p><p style="font-family:sans-serif;font-size:13px;color:#4b5563;">Recipient: ${esc(to)}<br>Subject: ${esc(subject)}<br>Email ID: ${esc(emailId)}</p>`,
      }).catch((err) => console.error('[resend-webhook] failed to send alert:', err))
    }
  }

  return Response.json({ received: true })
}

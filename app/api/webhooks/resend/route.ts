import { Webhook } from 'svix'

// Resend delivers bounce/delivery/complaint events via a Svix-signed webhook.
// This replaces the old Gmail NDR-scanning cron — Resend pushes events to us
// instead of us polling for them.
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
    console.warn(`[resend-webhook] ${type} — to: ${data.to?.join(', ') ?? 'unknown'}, email_id: ${data.email_id ?? 'unknown'}, subject: ${data.subject ?? 'unknown'}`)
  }

  return Response.json({ received: true })
}

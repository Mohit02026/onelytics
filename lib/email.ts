import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Onelytics <invites@onelytics.io>'

function devLog(label: string, fields: Record<string, string>) {
  console.log(`\n--- DEV EMAIL: ${label} ---`)
  for (const [k, v] of Object.entries(fields)) console.log(`${k}: ${v}`)
  console.log('----------------------------\n')
}

export async function sendOrgInviteEmail({
  to,
  inviteUrl,
  orgName,
  role,
}: {
  to: string
  inviteUrl: string
  orgName: string
  role: string
}) {
  if (!resend) {
    devLog('Org Invite', { to, inviteUrl, orgName, role })
    return { success: true }
  }
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to join ${orgName} on Onelytics`,
    html: emailHtml({
      title: `Join ${orgName}`,
      body: `You've been invited to join the <strong>${orgName}</strong> agency as a <strong>${role.toLowerCase()}</strong>. You'll have access to all client workspaces in the agency.`,
      ctaText: 'Accept Invitation',
      ctaUrl: inviteUrl,
      footer: 'This invitation expires in 7 days.',
    }),
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function sendWelcomeEmail({ to, name }: { to: string; name: string }) {
  if (!resend) {
    devLog('Welcome', { to, name })
    return { success: true }
  }
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to Onelytics',
    html: emailHtml({
      title: `Welcome, ${name || 'there'}!`,
      body: `Your Onelytics account is ready. Connect your first integration to start pulling data into your dashboard.`,
      ctaText: 'Go to Dashboard',
      ctaUrl: `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/`,
      footer: 'If you didn\'t create this account, you can ignore this email.',
    }),
  })
  if (error) return { error: error.message }
  return { success: true }
}

function emailHtml({ title, body, ctaText, ctaUrl, footer }: {
  title: string; body: string; ctaText: string; ctaUrl: string; footer: string
}) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#111827;">${title}</h2>
      <p style="color:#374151;font-size:16px;line-height:1.5;">${body}</p>
      <div style="margin:30px 0;">
        <a href="${ctaUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">${ctaText}</a>
      </div>
      <p style="color:#6b7280;font-size:14px;">Or copy this link: <a href="${ctaUrl}" style="color:#2563eb;">${ctaUrl}</a></p>
      <p style="color:#9ca3af;font-size:12px;margin-top:40px;border-top:1px solid #e5e7eb;padding-top:20px;">${footer}</p>
    </div>
  `
}

export async function sendInviteEmail({
  to,
  inviteUrl,
  workspaceName,
  role,
}: {
  to: string
  inviteUrl: string
  workspaceName: string
  role: string
}) {
  if (!resend) {
    console.log('\n--- DEV EMAIL FALLBACK ---')
    console.log(`To: ${to}`)
    console.log(`Subject: You've been invited to join ${workspaceName} on Onelytics`)
    console.log(`Role: ${role}`)
    console.log(`Invite URL: ${inviteUrl}`)
    console.log('--------------------------\n')
    return { success: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Onelytics <invites@onelytics.io>', // Update this with verified domain later
      to,
      subject: `You've been invited to join ${workspaceName} on Onelytics`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827;">Join ${workspaceName} on Onelytics</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            You've been invited to join the <strong>${workspaceName}</strong> workspace as a <strong>${role.toLowerCase()}</strong>.
          </p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            This invitation will expire in 7 days.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return { error: error.message }
    }

    return { success: true, data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send email'
    console.error('Failed to send email:', msg)
    return { error: msg }
  }
}

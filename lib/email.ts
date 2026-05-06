import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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
  } catch (err: any) {
    console.error('Failed to send email:', err)
    return { error: err.message || 'Failed to send email' }
  }
}

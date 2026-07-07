import { Job } from 'bullmq'
import { prisma } from '@/lib/db'
import { resolveMailAccessToken } from '@/services/google/mail-auth'

// Gmail has no bounce webhook — the only signal is the NDR ("Mail Delivery
// Subsystem") message Google drops back into the sender's own inbox. This
// scans for those in the last 7 days and logs which address failed, per
// connected mailbox. Best-effort, not wired to a specific send — good enough
// for the weekly cadence this feature runs at.
export async function processBounceCheckJob(_job: Job) {
  const mailboxes = await prisma.connectedMailbox.findMany({
    where: { provider: 'google' },
    select: { userId: true, emailAddress: true },
  })

  const results = await Promise.allSettled(mailboxes.map(checkBouncesForMailbox))
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[bounce-check] failed for ${mailboxes[i].emailAddress}:`, r.reason)
    }
  })
  return results
}

async function checkBouncesForMailbox(mailbox: { userId: string; emailAddress: string }) {
  const accessToken = await resolveMailAccessToken(mailbox.userId)

  const sinceEpochSeconds = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
  const query = `from:(mailer-daemon OR postmaster) after:${sinceEpochSeconds}`
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`)

  const { messages } = (await listRes.json()) as { messages?: { id: string }[] }
  if (!messages?.length) return { mailbox: mailbox.emailAddress, bounced: [] }

  const bounced = await Promise.all(
    messages.map(async (m) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=X-Failed-Recipients`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!res.ok) return null
      const data = await res.json()
      const headers = (data.payload?.headers ?? []) as { name: string; value: string }[]
      return headers.find((h) => h.name === 'X-Failed-Recipients')?.value ?? null
    })
  )

  const failedRecipients = bounced.filter((b): b is string => !!b)
  if (failedRecipients.length) {
    console.warn(`[bounce-check] ${mailbox.emailAddress} has bounces for: ${failedRecipients.join(', ')}`)
  }

  return { mailbox: mailbox.emailAddress, bounced: failedRecipients }
}

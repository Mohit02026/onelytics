import crypto from 'crypto'

export interface SendReportEmailInput {
  accessToken: string
  from: string
  to: string[]
  subject: string
  html: string
  attachment?: { filename: string; contentType: string; data: Buffer }
}

function encodeHeader(value: string): string {
  return /[^\x00-\x7F]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
    : value
}

function buildMimeMessage(input: SendReportEmailInput): string {
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to.join(', ')}`,
    `Subject: ${encodeHeader(input.subject)}`,
    'MIME-Version: 1.0',
  ]

  if (!input.attachment) {
    headers.push('Content-Type: text/html; charset=UTF-8')
    return [...headers, '', input.html].join('\r\n')
  }

  const boundary = `boundary_${crypto.randomUUID()}`
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)

  const body = [
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    input.html,
    `--${boundary}`,
    `Content-Type: ${input.attachment.contentType}; name="${input.attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${input.attachment.filename}"`,
    '',
    input.attachment.data.toString('base64'),
    `--${boundary}--`,
  ]

  return [...headers, '', ...body].join('\r\n')
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function sendReportEmail(input: SendReportEmailInput): Promise<{ id: string }> {
  const raw = toBase64Url(buildMimeMessage(input))

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gmail send failed: ${err.error?.message ?? res.status}`)
  }

  const data = await res.json()
  return { id: data.id }
}

import { describe, it, expect, vi, afterEach } from 'vitest'
import { sendReportEmail } from '@/services/google/mail-send'

function decodeRaw(raw: string): string {
  const base64 = raw.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('utf8')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendReportEmail', () => {
  it('U45: posts to the Gmail send endpoint with a bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'msg-1' }) })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendReportEmail({
      accessToken: 'token-abc',
      from: 'me@example.com',
      to: ['client@example.com'],
      subject: 'Weekly Report',
      html: '<p>Hello</p>',
    })

    expect(result).toEqual({ id: 'msg-1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send')
    expect(init.headers.Authorization).toBe('Bearer token-abc')
  })

  it('U46: encodes From/To/Subject and body correctly in the raw message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'msg-2' }) })
    vi.stubGlobal('fetch', fetchMock)

    await sendReportEmail({
      accessToken: 't',
      from: 'me@example.com',
      to: ['a@example.com', 'b@example.com'],
      subject: 'Plain Subject',
      html: '<p>Body content</p>',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const mime = decodeRaw(body.raw)
    expect(mime).toContain('From: me@example.com')
    expect(mime).toContain('To: a@example.com, b@example.com')
    expect(mime).toContain('Subject: Plain Subject')
    expect(mime).toContain('<p>Body content</p>')
  })

  it('U47: builds a multipart message with a base64 attachment when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'msg-3' }) })
    vi.stubGlobal('fetch', fetchMock)

    await sendReportEmail({
      accessToken: 't',
      from: 'me@example.com',
      to: ['a@example.com'],
      subject: 'With attachment',
      html: '<p>See attached</p>',
      attachment: { filename: 'report.pdf', contentType: 'application/pdf', data: Buffer.from('pdf-bytes') },
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const mime = decodeRaw(body.raw)
    expect(mime).toContain('Content-Type: multipart/mixed')
    expect(mime).toContain('Content-Disposition: attachment; filename="report.pdf"')
    expect(mime).toContain(Buffer.from('pdf-bytes').toString('base64'))
  })

  it('U48: encodes a non-ASCII subject as RFC 2047 UTF-8 base64', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'msg-4' }) })
    vi.stubGlobal('fetch', fetchMock)

    await sendReportEmail({
      accessToken: 't',
      from: 'me@example.com',
      to: ['a@example.com'],
      subject: 'Café Report',
      html: '<p>x</p>',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const mime = decodeRaw(body.raw)
    expect(mime).toContain(`Subject: =?UTF-8?B?${Buffer.from('Café Report', 'utf8').toString('base64')}?=`)
  })

  it('U49: throws with the Gmail API error message on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid grant' } }),
    }))

    await expect(sendReportEmail({
      accessToken: 'expired',
      from: 'me@example.com',
      to: ['a@example.com'],
      subject: 'x',
      html: 'x',
    })).rejects.toThrow('Invalid grant')
  })
})

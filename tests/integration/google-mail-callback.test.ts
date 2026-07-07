import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

const { fakeRedisStore, fakeRedis } = vi.hoisted(() => {
  const store = new Map<string, string>()
  return {
    fakeRedisStore: store,
    fakeRedis: {
      set: async (key: string, value: string) => { store.set(key, value) },
      get: async (key: string) => store.get(key) ?? null,
      del: async (key: string) => { store.delete(key) },
    },
  }
})

vi.mock('@/lib/db', async () => {
  const { testPrisma } = await import('./helpers')
  return { prisma: testPrisma }
})
vi.mock('@/lib/redis', () => ({ redis: fakeRedis }))
vi.mock('@/services/google/mail-auth', async () => {
  const actual = await vi.importActual('@/services/google/mail-auth')
  return { ...actual, exchangeMailCodeForTokens: vi.fn() }
})

import { GET } from '@/app/api/integrations/google-mail/callback/route'
import { exchangeMailCodeForTokens } from '@/services/google/mail-auth'
import { testPrisma, seedUser, cleanupUserByEmail } from './helpers'

const OWNER_EMAIL = 'gmail-callback-owner@onelytics-test.invalid'
let ownerData: Awaited<ReturnType<typeof seedUser>>

function makeState(userId: string) {
  const state = `state-${userId}`
  fakeRedisStore.set(`google_mail_oauth_state:${state}`, JSON.stringify({ userId }))
  return state
}

beforeAll(async () => {
  ownerData = await seedUser(OWNER_EMAIL, 'OWNER')
})

beforeEach(async () => {
  fakeRedisStore.clear()
  vi.mocked(exchangeMailCodeForTokens).mockReset()
  await testPrisma.connectedMailbox.deleteMany({ where: { userId: ownerData.user.id } })
})

afterAll(async () => {
  await cleanupUserByEmail(OWNER_EMAIL)
})

function req(qs: string) {
  return new Request(`http://localhost/api/integrations/google-mail/callback${qs}`)
}

describe('GET /api/integrations/google-mail/callback', () => {
  it('I40: redirects with google_denied when Google reports an error param', async () => {
    const res = await GET(req('?error=access_denied'))
    expect(new URL(res.headers.get('location')!).searchParams.get('mailError')).toBe('google_denied')
  })

  it('I41: redirects with invalid_callback when code or state is missing', async () => {
    const res = await GET(req('?state=abc'))
    expect(new URL(res.headers.get('location')!).searchParams.get('mailError')).toBe('invalid_callback')
  })

  it('I42: redirects with invalid_state when the state is not in redis (expired/forged)', async () => {
    const res = await GET(req('?code=abc&state=unknown-state'))
    expect(new URL(res.headers.get('location')!).searchParams.get('mailError')).toBe('invalid_state')
  })

  it('I43: valid state + successful exchange creates ConnectedMailbox and redirects with mail=connected', async () => {
    const state = makeState(ownerData.user.id)
    vi.mocked(exchangeMailCodeForTokens).mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 3600,
      scope: 'openid email https://www.googleapis.com/auth/gmail.send',
      emailAddress: 'sender@example.com',
    })

    const res = await GET(req(`?code=valid-code&state=${state}`))

    expect(new URL(res.headers.get('location')!).searchParams.get('mail')).toBe('connected')
    const mailbox = await testPrisma.connectedMailbox.findUnique({
      where: { userId_provider: { userId: ownerData.user.id, provider: 'google' } },
    })
    expect(mailbox?.emailAddress).toBe('sender@example.com')
    // State is single-use
    expect(fakeRedisStore.has(`google_mail_oauth_state:${state}`)).toBe(false)
  })

  it('I44: token exchange failure redirects with token_exchange_failed and creates no mailbox', async () => {
    const state = makeState(ownerData.user.id)
    vi.mocked(exchangeMailCodeForTokens).mockRejectedValue(new Error('boom'))

    const res = await GET(req(`?code=bad-code&state=${state}`))

    expect(new URL(res.headers.get('location')!).searchParams.get('mailError')).toBe('token_exchange_failed')
    const mailbox = await testPrisma.connectedMailbox.findUnique({
      where: { userId_provider: { userId: ownerData.user.id, provider: 'google' } },
    })
    expect(mailbox).toBeNull()
  })
})

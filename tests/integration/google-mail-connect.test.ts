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
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

import { GET } from '@/app/api/integrations/google-mail/connect/route'
import { auth } from '@/lib/auth'
import { seedUser, cleanupUserByEmail, fakeSession } from './helpers'

const OWNER_EMAIL = 'gmail-connect-owner@onelytics-test.invalid'
let ownerData: Awaited<ReturnType<typeof seedUser>>

beforeAll(async () => {
  ownerData = await seedUser(OWNER_EMAIL, 'OWNER')
})

beforeEach(() => {
  fakeRedisStore.clear()
  vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
})

afterAll(async () => {
  await cleanupUserByEmail(OWNER_EMAIL)
})

describe('GET /api/integrations/google-mail/connect', () => {
  it('I38: returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('I39: returns a Google OAuth URL requesting only gmail.send (+ openid/email) and stores state keyed to the user', async () => {
    const res = await GET()
    expect(res.status).toBe(200)

    const { url } = await res.json()
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(parsed.searchParams.get('scope')).toBe('openid email https://www.googleapis.com/auth/gmail.send')
    expect(parsed.searchParams.get('access_type')).toBe('offline')

    const state = parsed.searchParams.get('state')!
    expect(fakeRedisStore.has(`google_mail_oauth_state:${state}`)).toBe(true)
    const stored = JSON.parse(fakeRedisStore.get(`google_mail_oauth_state:${state}`)!)
    expect(stored.userId).toBe(ownerData.user.id)
  })
})

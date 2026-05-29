import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import crypto from 'crypto'

// Set ENCRYPTION_KEY if not already present (vitest does not auto-load .env in all configurations).
// Uses a deterministic test key derived programmatically — never a hardcoded literal.
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = crypto.createHash('sha256').update('onelytics-test-key').digest('hex')
}

vi.mock('@/lib/db', async () => {
  const { testPrisma } = await import('./helpers')
  return { prisma: testPrisma }
})

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock getTikTokReport so I21/I22 route calls don't hit the real TikTok API after refresh
vi.mock('@/services/tiktok/ads', () => ({
  getTikTokReport: vi.fn().mockResolvedValue({
    overview: {},
    daily: [],
    campaigns: [],
    dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
  }),
}))

import { resolveGoogleToken } from '@/services/google/auth'
import { exchangeCodeForTokens as metaExchangeCodeForTokens } from '@/services/meta/auth'
import { GET as tiktokAnalyticsGET } from '@/app/api/analytics/tiktok/route'
import { auth } from '@/lib/auth'
import { encrypt, decrypt } from '@/lib/encryption'
import { testPrisma, seedUser, cleanupUserByEmail, fakeSession } from './helpers'

const GOOGLE_EMAIL = 'token-refresh-google@onelytics-test.invalid'
const TIKTOK_EMAIL = 'token-refresh-tiktok@onelytics-test.invalid'

let googleData: Awaited<ReturnType<typeof seedUser>>
let tiktokData: Awaited<ReturnType<typeof seedUser>>

beforeAll(async () => {
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
  // Short placeholder values — fetch is mocked so these are never sent to a real provider
  process.env.GOOGLE_CLIENT_ID     = 'test-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
  process.env.META_APP_ID          = 'test-app-id'
  process.env.META_APP_SECRET      = 'test-secret'
  process.env.TIKTOK_APP_ID        = 'test-app-id'
  process.env.TIKTOK_APP_SECRET    = 'test-secret'

  googleData = await seedUser(GOOGLE_EMAIL)
  tiktokData = await seedUser(TIKTOK_EMAIL)
})

afterAll(async () => {
  await cleanupUserByEmail(GOOGLE_EMAIL)
  await cleanupUserByEmail(TIKTOK_EMAIL)
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await testPrisma.connectedAccount.deleteMany({
    where: { workspaceId: { in: [googleData.workspace.id, tiktokData.workspace.id] } },
  })
  await testPrisma.analyticsCache.deleteMany({
    where: { workspaceId: tiktokData.workspace.id },
  })
})

function makeTikTokReq(startDate = '2024-01-01', endDate = '2024-01-31') {
  return new Request(
    `http://localhost/api/analytics/tiktok?startDate=${startDate}&endDate=${endDate}`,
  )
}

// ─── I18 ─────────────────────────────────────────────────────────────────────

describe('I18: resolveGoogleToken — expired token + valid refreshToken → refreshes and stores', () => {
  it('returns the new decrypted access token and updates DB', async () => {
    const plainAccess  = 'old-google-access-token'
    const plainRefresh = 'google-refresh-token'
    const workspaceId  = googleData.workspace.id

    await testPrisma.connectedAccount.create({
      data: {
        workspaceId,
        provider:     'google',
        accessToken:  encrypt(plainAccess),
        refreshToken: encrypt(plainRefresh),
        expiresAt:    new Date(Date.now() - 60_000), // expired 1 min ago
      },
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok:   true,
        json: async () => ({ access_token: 'new-google-token', expires_in: 3600 }),
      }),
    )

    const account = await testPrisma.connectedAccount.findUniqueOrThrow({
      where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    })

    const result = await resolveGoogleToken(workspaceId, {
      accessToken:  account.accessToken,
      refreshToken: account.refreshToken,
      expiresAt:    account.expiresAt,
    })

    expect(result).toBe('new-google-token')

    const updated = await testPrisma.connectedAccount.findUniqueOrThrow({
      where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    })
    expect(decrypt(updated.accessToken)).toBe('new-google-token')
  })
})

// ─── I19 ─────────────────────────────────────────────────────────────────────

describe('I19: resolveGoogleToken — expired token + null refreshToken → throws', () => {
  it('throws rather than returning stale token', async () => {
    const workspaceId = googleData.workspace.id

    await testPrisma.connectedAccount.create({
      data: {
        workspaceId,
        provider:     'google',
        accessToken:  encrypt('stale-access-token'),
        refreshToken: null,
        expiresAt:    new Date(Date.now() - 60_000),
      },
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        throw new Error('fetch should not have been called')
      }),
    )

    const account = await testPrisma.connectedAccount.findUniqueOrThrow({
      where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    })

    await expect(
      resolveGoogleToken(workspaceId, {
        accessToken:  account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt:    account.expiresAt,
      }),
    ).rejects.toThrow()
  })
})

// ─── I20 ─────────────────────────────────────────────────────────────────────

describe('I20: resolveGoogleToken — non-expired token → returns without refresh', () => {
  it('returns existing decrypted token and does not call fetch', async () => {
    const plainAccess = 'valid-google-access-token'
    const workspaceId = googleData.workspace.id

    await testPrisma.connectedAccount.create({
      data: {
        workspaceId,
        provider:     'google',
        accessToken:  encrypt(plainAccess),
        refreshToken: encrypt('some-refresh-token'),
        expiresAt:    new Date(Date.now() + 600_000), // expires in 10 min
      },
    })

    const fetchSpy = vi.fn().mockImplementation(() => {
      throw new Error('fetch should not have been called')
    })
    vi.stubGlobal('fetch', fetchSpy)

    const account = await testPrisma.connectedAccount.findUniqueOrThrow({
      where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    })

    const result = await resolveGoogleToken(workspaceId, {
      accessToken:  account.accessToken,
      refreshToken: account.refreshToken,
      expiresAt:    account.expiresAt,
    })

    expect(result).toBe(plainAccess)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

// ─── I21 ─────────────────────────────────────────────────────────────────────

describe('I21: TikTok token within 1h of expiry → refresh triggered and new token stored', () => {
  it('stores new accessToken and refreshToken in DB after successful refresh', async () => {
    const workspaceId = tiktokData.workspace.id

    await testPrisma.connectedAccount.create({
      data: {
        workspaceId,
        provider:     'tiktok',
        accessToken:  encrypt('old-tiktok-token'),
        refreshToken: encrypt('old-tiktok-refresh'),
        expiresAt:    new Date(Date.now() + 1_800_000), // 30 min — within 1h threshold
      },
    })

    vi.mocked(auth).mockResolvedValue(
      fakeSession(tiktokData.user.id, workspaceId) as any,
    )

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok:   true,
        json: async () => ({
          code: 0,
          data: {
            access_token:             'new-tiktok',
            expires_in:               86400,
            refresh_token:            'new-refresh',
            refresh_token_expires_in: 2592000,
          },
        }),
      }),
    )

    const res = await tiktokAnalyticsGET(makeTikTokReq())
    expect(res.status).not.toBe(500)

    const updated = await testPrisma.connectedAccount.findUniqueOrThrow({
      where: { workspaceId_provider: { workspaceId, provider: 'tiktok' } },
    })
    expect(decrypt(updated.accessToken)).toBe('new-tiktok')
    expect(decrypt(updated.refreshToken!)).toBe('new-refresh')
  })
})

// ─── I22 ─────────────────────────────────────────────────────────────────────

describe('I22: TikTok token refresh fails → error swallowed, old token untouched', () => {
  it('does not throw and DB still holds the original encrypted access token', async () => {
    const workspaceId = tiktokData.workspace.id

    await testPrisma.connectedAccount.create({
      data: {
        workspaceId,
        provider:     'tiktok',
        accessToken:  encrypt('old-tiktok-token'),
        refreshToken: encrypt('old-tiktok-refresh'),
        expiresAt:    new Date(Date.now() + 1_800_000), // 30 min — within 1h threshold
      },
    })

    vi.mocked(auth).mockResolvedValue(
      fakeSession(tiktokData.user.id, workspaceId) as any,
    )

    // Provider returns a failed refresh code — the route should swallow it
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok:   true,
        json: async () => ({ code: 40001, message: 'invalid token' }),
      }),
    )

    const res = await tiktokAnalyticsGET(makeTikTokReq())
    expect(res.status).not.toBe(500)

    const account = await testPrisma.connectedAccount.findUniqueOrThrow({
      where: { workspaceId_provider: { workspaceId, provider: 'tiktok' } },
    })
    expect(decrypt(account.accessToken)).toBe('old-tiktok-token')
  })
})

// ─── I23 ─────────────────────────────────────────────────────────────────────

describe('I23: Meta exchangeCodeForTokens — missing access_token → throws', () => {
  it('throws when provider response has no access_token field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok:   true,
        json: async () => ({ token_type: 'bearer' }),
      }),
    )

    // The service returns { accessToken: data.access_token, ... } — undefined if unchecked.
    // This test asserts the expected contract: missing access_token must throw, not silently
    // return undefined to be stored in the DB.
    await expect(
      metaExchangeCodeForTokens('fake-code', 'http://localhost:3000/callback'),
    ).rejects.toThrow()
  })
})

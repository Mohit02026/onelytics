import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

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

vi.mock('@/lib/notify', () => ({
  notifyWorkspace: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/integrations/google/disconnect/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, cleanupUserByEmail, fakeSession } from './helpers'

const OWNER_EMAIL = 'gdisconnect-owner@onelytics-test.invalid'

let ownerData: Awaited<ReturnType<typeof seedUser>>

const INITIAL_METADATA = {
  googleAdsCustomerId: '123-456-7890',
  gscSiteUrl: 'https://example.com',
  gbpLocationId: 'locations/12345',
  gbpLocationName: 'My Business',
}

async function seedGoogleAccount() {
  await testPrisma.connectedAccount.deleteMany({
    where: { workspaceId: ownerData.workspace.id, provider: 'google' },
  })
  await testPrisma.connectedAccount.create({
    data: {
      workspaceId: ownerData.workspace.id,
      provider: 'google',
      accessToken: 'encrypted-token-placeholder',
      propertyId: 'GA4-123',
      metadata: INITIAL_METADATA,
    },
  })
}

beforeAll(async () => {
  ownerData = await seedUser(OWNER_EMAIL, 'OWNER')
})

beforeEach(async () => {
  await seedGoogleAccount()
  vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
})

afterAll(async () => {
  await cleanupUserByEmail(OWNER_EMAIL)
})

describe('POST /api/integrations/google/disconnect', () => {
  // I37
  it('I37: disconnecting ads removes only googleAdsCustomerId, leaves other metadata intact', async () => {
    const res = await POST(
      new Request('http://localhost/api/integrations/google/disconnect?service=ads', { method: 'POST' }),
    )
    expect(res.status).toBe(200)

    const account = await testPrisma.connectedAccount.findUnique({
      where: { workspaceId_provider: { workspaceId: ownerData.workspace.id, provider: 'google' } },
    })

    // Account still exists
    expect(account).not.toBeNull()

    const meta = account!.metadata as Record<string, unknown>
    // Ads customer ID removed
    expect(meta.googleAdsCustomerId).toBeUndefined()
    // Other fields untouched
    expect(meta.gscSiteUrl).toBe('https://example.com')
    expect(meta.gbpLocationId).toBe('locations/12345')
    expect(meta.gbpLocationName).toBe('My Business')
  })
})

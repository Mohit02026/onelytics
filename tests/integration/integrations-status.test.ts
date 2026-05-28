import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'

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

import { GET } from '@/app/api/integrations/status/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, cleanupUserByEmail, fakeSession } from './helpers'

const WS_A_EMAIL = 'status-user-a@onelytics-test.invalid'
const WS_B_EMAIL = 'status-user-b@onelytics-test.invalid'

let wsAData: Awaited<ReturnType<typeof seedUser>>
let wsBData: Awaited<ReturnType<typeof seedUser>>

beforeAll(async () => {
  wsAData = await seedUser(WS_A_EMAIL)
  wsBData = await seedUser(WS_B_EMAIL)

  // Seed a Google connected account for Workspace A (with encrypted token placeholder)
  await testPrisma.connectedAccount.create({
    data: {
      workspaceId: wsAData.workspace.id,
      provider: 'google',
      accessToken: 'encrypted-token-placeholder',
      propertyId: 'GA4-123',
      metadata: { gscSiteUrl: 'https://example.com', googleAdsCustomerId: '123-456-7890' },
    },
  })
})

afterAll(async () => {
  await cleanupUserByEmail(WS_A_EMAIL)
  await cleanupUserByEmail(WS_B_EMAIL)
})

describe('GET /api/integrations/status', () => {
  // I14
  it('I14: returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  // I15
  it('I15: returns correct connected platform flags for the workspace', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(wsAData.user.id, wsAData.workspace.id) as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.google).toBe(true)
    expect(body.meta).toBe(false)
    expect(body.tiktok).toBe(false)
    expect(body.linkedin).toBe(false)
  })

  // I16
  it('I16: response body does not expose accessToken or refreshToken', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(wsAData.user.id, wsAData.workspace.id) as any)
    const res = await GET()
    const body = await res.json()
    const bodyStr = JSON.stringify(body)
    expect(bodyStr).not.toContain('accessToken')
    expect(bodyStr).not.toContain('refreshToken')
    expect(bodyStr).not.toContain('encrypted-token-placeholder')
  })

  // I17
  it('I17: Workspace B user does not see Workspace A\'s connected accounts', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(wsBData.user.id, wsBData.workspace.id) as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.google).toBe(false)
    expect(body.propertyId).toBeNull()
  })

  // I36
  it('I36: null metadata on ConnectedAccount does not crash status route', async () => {
    // Seed a workspace with a google account that has null metadata
    const { user, workspace } = wsBData
    await testPrisma.connectedAccount.create({
      data: {
        workspaceId: workspace.id,
        provider: 'google',
        accessToken: 'encrypted-placeholder',
        metadata: null,
      },
    })

    vi.mocked(auth).mockResolvedValue(fakeSession(user.id, workspace.id) as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    // google flag should be true — account exists
    expect(body.google).toBe(true)
    // metadata-derived fields default to null without crashing
    expect(body.gscSiteUrl).toBeNull()
    expect(body.googleAdsCustomerId).toBeNull()
    expect(body.gbpLocationId).toBeNull()

    // Clean up so other tests are unaffected
    await testPrisma.connectedAccount.deleteMany({ where: { workspaceId: workspace.id, provider: 'google' } })
  })
})

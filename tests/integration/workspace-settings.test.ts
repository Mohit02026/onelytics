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

// reports/route uses next/headers — mock it so the module loads in test env
vi.mock('next/headers', () => ({
  headers: () => ({ get: () => null }),
  cookies: () => ({ get: () => null }),
}))

// reports POST calls generateReport which makes real external calls; short-circuit it
vi.mock('@/services/reports/generate', () => ({
  generateReport: vi.fn().mockResolvedValue({ sections: [] }),
  generateAINarrative: vi.fn().mockResolvedValue(null),
}))

import { PATCH } from '@/app/api/workspace/route'
import { GET  as getGa4 } from '@/app/api/analytics/ga4/route'
import { POST as postReport } from '@/app/api/reports/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, addUserToWorkspace, cleanupUserByEmail, fakeSession } from './helpers'

const OWNER_EMAIL  = 'ws-settings-owner@onelytics-test.invalid'
const MEMBER_EMAIL = 'ws-settings-member@onelytics-test.invalid'
const VIEWER_EMAIL = 'ws-settings-viewer@onelytics-test.invalid'

let ownerData: Awaited<ReturnType<typeof seedUser>>
let memberUser: Awaited<ReturnType<typeof addUserToWorkspace>>
let viewerUser: Awaited<ReturnType<typeof addUserToWorkspace>>

beforeAll(async () => {
  ownerData  = await seedUser(OWNER_EMAIL, 'OWNER')
  memberUser = await addUserToWorkspace(MEMBER_EMAIL, ownerData.workspace.id, ownerData.org.id, 'MEMBER')
  viewerUser = await addUserToWorkspace(VIEWER_EMAIL, ownerData.workspace.id, ownerData.org.id, 'VIEWER')
})

afterAll(async () => {
  await testPrisma.generatedReport.deleteMany({ where: { workspaceId: ownerData.workspace.id } })
  await cleanupUserByEmail(VIEWER_EMAIL)
  await cleanupUserByEmail(MEMBER_EMAIL)
  await cleanupUserByEmail(OWNER_EMAIL)
})

describe('PATCH /api/workspace', () => {
  // I29
  it('I29: MEMBER cannot rename workspace — returns 403', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(memberUser.id, ownerData.workspace.id) as any)
    const res = await PATCH(
      new Request('http://localhost/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked Name' }),
      }),
    )
    expect(res.status).toBe(403)
  })
})

describe('GET /api/analytics/ga4', () => {
  // I30
  it('I30: returns 404 when Google not connected', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
    // Workspace has no ConnectedAccount — seed none
    const res = await getGa4(
      new Request('http://localhost/api/analytics/ga4?startDate=2024-01-01&endDate=2024-01-31'),
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/reports', () => {
  // I31 — Note: the reports route does not currently enforce role restrictions.
  // This test documents the missing check and will fail until a role guard is added.
  it('I31: VIEWER cannot generate reports — returns 403', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(viewerUser.id, ownerData.workspace.id) as any)
    const res = await postReport(
      new Request('http://localhost/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Report',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          selectedPlatforms: ['ga4'],
        }),
      }),
    )
    expect(res.status).toBe(403)
  })
})

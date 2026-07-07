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

vi.mock('@/lib/email', () => ({
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
  sendOrgInviteEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/org/invite/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, addUserToWorkspace, cleanupUserByEmail, fakeSession } from './helpers'

const OWNER_EMAIL  = 'org-invite-owner@onelytics-test.invalid'
const MEMBER_EMAIL = 'org-invite-member@onelytics-test.invalid'

let ownerData: Awaited<ReturnType<typeof seedUser>>

beforeAll(async () => {
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
  ownerData = await seedUser(OWNER_EMAIL, 'OWNER')
  await addUserToWorkspace(MEMBER_EMAIL, ownerData.workspace.id, ownerData.org.id, 'MEMBER')
  await testPrisma.orgMember.create({
    data: {
      organizationId: ownerData.org.id,
      userId: (await testPrisma.user.findUniqueOrThrow({ where: { email: MEMBER_EMAIL } })).id,
      role: 'MEMBER',
    },
  })
})

afterAll(async () => {
  await testPrisma.orgInvite.deleteMany({ where: { organizationId: ownerData.org.id } })
  await cleanupUserByEmail(MEMBER_EMAIL)
  await cleanupUserByEmail(OWNER_EMAIL)
})

function makeReq(body: object) {
  return new Request('http://localhost/api/org/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Regression coverage for the case-insensitivity fix made to app/api/org/invite/route.ts.
describe('POST /api/org/invite — case insensitivity', () => {
  it('I60: inviting an existing org member with mixed-case email still returns 409', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id, ownerData.org.id) as any)
    const mixedCase = MEMBER_EMAIL.replace('org-invite-member', 'Org-Invite-Member')
    const res = await POST(makeReq({ email: mixedCase, role: 'MEMBER' }))
    expect(res.status).toBe(409)
  })

  it('I61: re-inviting with a different case replaces the previous pending invite, not duplicates it', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id, ownerData.org.id) as any)
    const email = 'org-case-invite@onelytics-test.invalid'

    await POST(makeReq({ email, role: 'MEMBER' }))
    const res2 = await POST(makeReq({ email: 'Org-Case-Invite@Onelytics-Test.invalid', role: 'ADMIN' }))
    expect(res2.status).toBe(200)

    const invites = await testPrisma.orgInvite.findMany({
      where: { organizationId: ownerData.org.id, email },
    })
    expect(invites).toHaveLength(1)
    expect(invites[0].role).toBe('ADMIN')
  })

  it('I62: the stored invite email is lowercased regardless of input case', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id, ownerData.org.id) as any)
    const res = await POST(makeReq({ email: 'MixedCase@OneLytics-Org.invalid', role: 'MEMBER' }))
    const body = await res.json()
    expect(body.email).toBe('mixedcase@onelytics-org.invalid')
  })
})

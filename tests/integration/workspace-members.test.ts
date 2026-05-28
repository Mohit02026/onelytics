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

import { GET } from '@/app/api/workspace/members/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, addUserToWorkspace, cleanupUserByEmail, fakeSession } from './helpers'

const OWNER_EMAIL = 'ws-members-owner@onelytics-test.invalid'
const MEMBER_EMAIL = 'ws-members-member@onelytics-test.invalid'
const OTHER_EMAIL  = 'ws-members-other@onelytics-test.invalid'

let ownerData: Awaited<ReturnType<typeof seedUser>>
let otherData:  Awaited<ReturnType<typeof seedUser>>
let memberUser: Awaited<ReturnType<typeof addUserToWorkspace>>

beforeAll(async () => {
  ownerData  = await seedUser(OWNER_EMAIL, 'OWNER')
  otherData  = await seedUser(OTHER_EMAIL,  'OWNER')
  memberUser = await addUserToWorkspace(
    MEMBER_EMAIL,
    ownerData.workspace.id,
    ownerData.org.id,
    'MEMBER',
  )
})

afterAll(async () => {
  await cleanupUserByEmail(MEMBER_EMAIL)
  await cleanupUserByEmail(OWNER_EMAIL)
  await cleanupUserByEmail(OTHER_EMAIL)
})

describe('GET /api/workspace/members', () => {
  // I5
  it('I5: returns only members of the requesting user\'s own workspace', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const emails = body.members.map((m: { user: { email: string } }) => m.user.email)
    expect(emails).toContain(OWNER_EMAIL)
    expect(emails).toContain(MEMBER_EMAIL)
    expect(body.members).toHaveLength(2)
  })

  // I6
  it('I6: returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  // I7
  it('I7: does not return members from a different workspace', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
    const res = await GET()
    const body = await res.json()
    const emails = body.members.map((m: { user: { email: string } }) => m.user.email)
    expect(emails).not.toContain(OTHER_EMAIL)
  })

  // I34
  it('I34: expired pending invites are filtered out of the invites list', async () => {
    const futureToken = 'i34-active-token-' + Date.now().toString(16)
    const expiredToken = 'i34-expired-token-' + Date.now().toString(16)

    await testPrisma.workspaceInvite.createMany({
      data: [
        {
          workspaceId: ownerData.workspace.id,
          email: 'i34-active@onelytics-test.invalid',
          role: 'MEMBER',
          token: futureToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          workspaceId: ownerData.workspace.id,
          email: 'i34-expired@onelytics-test.invalid',
          role: 'MEMBER',
          token: expiredToken,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      ],
    })

    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    const inviteEmails = body.invites.map((inv: { email: string }) => inv.email)
    expect(inviteEmails).toContain('i34-active@onelytics-test.invalid')
    expect(inviteEmails).not.toContain('i34-expired@onelytics-test.invalid')

    // Clean up
    await testPrisma.workspaceInvite.deleteMany({
      where: { token: { in: [futureToken, expiredToken] } },
    })
  })
})

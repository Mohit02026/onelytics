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

vi.mock('@/lib/notify', () => ({
  notifyWorkspace: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from '@/app/api/invite/[token]/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, addUserToWorkspace, cleanupUserByEmail, fakeSession } from './helpers'
import { randomBytes } from 'crypto'

const OWNER_EMAIL  = 'invite-accept-owner@onelytics-test.invalid'
const MEMBER_EMAIL = 'invite-accept-member@onelytics-test.invalid'

let ownerData: Awaited<ReturnType<typeof seedUser>>
let memberUser: Awaited<ReturnType<typeof addUserToWorkspace>>

beforeAll(async () => {
  ownerData  = await seedUser(OWNER_EMAIL, 'OWNER')
  memberUser = await addUserToWorkspace(MEMBER_EMAIL, ownerData.workspace.id, ownerData.org.id, 'MEMBER')
})

afterAll(async () => {
  await testPrisma.workspaceInvite.deleteMany({ where: { workspaceId: ownerData.workspace.id } })
  await cleanupUserByEmail(MEMBER_EMAIL)
  await cleanupUserByEmail(OWNER_EMAIL)
})

describe('POST /api/invite/[token] — idempotent accept for existing member', () => {
  // I32
  it('I32: already-member accepting an invite does not change their role', async () => {
    const token = randomBytes(32).toString('hex')
    await testPrisma.workspaceInvite.create({
      data: {
        workspaceId: ownerData.workspace.id,
        email: MEMBER_EMAIL,
        role: 'ADMIN',
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    vi.mocked(auth).mockResolvedValue(fakeSession(memberUser.id, ownerData.workspace.id) as any)
    const res = await POST(
      new Request(`http://localhost/api/invite/${token}`, { method: 'POST' }),
      { params: { token } },
    )
    expect(res.status).toBe(200)

    // Role should still be MEMBER, not upgraded to ADMIN
    const membership = await testPrisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ownerData.workspace.id, userId: memberUser.id } },
    })
    expect(membership?.role).toBe('MEMBER')
  })
})

describe('GET /api/invite/[token] — expired invite', () => {
  // I33
  it('I33: expired invite returns 410', async () => {
    const token = randomBytes(32).toString('hex')
    await testPrisma.workspaceInvite.create({
      data: {
        workspaceId: ownerData.workspace.id,
        email: 'expired-invite@onelytics-test.invalid',
        role: 'MEMBER',
        token,
        // 1 day in the past
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    })

    const res = await GET(
      new Request(`http://localhost/api/invite/${token}`),
      { params: { token } },
    )
    expect(res.status).toBe(410)
  })
})

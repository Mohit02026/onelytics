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

import { POST } from '@/app/api/workspace/invite/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, addUserToWorkspace, cleanupUserByEmail, fakeSession } from './helpers'

const OWNER_EMAIL  = 'invite-owner@onelytics-test.invalid'
const MEMBER_EMAIL = 'invite-member@onelytics-test.invalid'
const VIEWER_EMAIL = 'invite-viewer@onelytics-test.invalid'
const TARGET_EMAIL = 'invite-target@onelytics-test.invalid'

let ownerData:  Awaited<ReturnType<typeof seedUser>>
let memberUser: Awaited<ReturnType<typeof addUserToWorkspace>>
let viewerUser: Awaited<ReturnType<typeof addUserToWorkspace>>

beforeAll(async () => {
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
  ownerData  = await seedUser(OWNER_EMAIL, 'OWNER')
  memberUser = await addUserToWorkspace(MEMBER_EMAIL, ownerData.workspace.id, ownerData.org.id, 'MEMBER')
  viewerUser = await addUserToWorkspace(VIEWER_EMAIL, ownerData.workspace.id, ownerData.org.id, 'VIEWER')
})

afterAll(async () => {
  await testPrisma.workspaceInvite.deleteMany({ where: { workspaceId: ownerData.workspace.id } })
  await cleanupUserByEmail(VIEWER_EMAIL)
  await cleanupUserByEmail(MEMBER_EMAIL)
  await cleanupUserByEmail(OWNER_EMAIL)
})

function makeReq(body: object) {
  return new Request('http://localhost/api/workspace/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/workspace/invite', () => {
  // I8
  it('I8: OWNER can send an invite — returns 200 with token', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
    const res = await POST(makeReq({ email: TARGET_EMAIL, role: 'MEMBER' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBeTruthy()
    expect(body.email).toBe(TARGET_EMAIL)
  })

  // I9
  it('I9: MEMBER cannot invite — returns 403', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(memberUser.id, ownerData.workspace.id) as any)
    const res = await POST(makeReq({ email: 'other@test.invalid', role: 'MEMBER' }))
    expect(res.status).toBe(403)
  })

  // I10
  it('I10: VIEWER cannot invite — returns 403', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(viewerUser.id, ownerData.workspace.id) as any)
    const res = await POST(makeReq({ email: 'other@test.invalid', role: 'MEMBER' }))
    expect(res.status).toBe(403)
  })

  // I11
  it('I11: re-inviting the same email replaces the previous pending invite', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
    const email = 'dup-invite@onelytics-test.invalid'

    await POST(makeReq({ email, role: 'MEMBER' }))
    const res2 = await POST(makeReq({ email, role: 'VIEWER' }))
    expect(res2.status).toBe(200)

    const invites = await testPrisma.workspaceInvite.findMany({
      where: { workspaceId: ownerData.workspace.id, email },
    })
    // Only one invite should exist (old one was deleted)
    expect(invites).toHaveLength(1)
    expect(invites[0].role).toBe('VIEWER')
  })

  // I12
  it('I12: token is a 64-char hex string and expiry is ~7 days from now', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
    const email = 'token-check@onelytics-test.invalid'
    const res = await POST(makeReq({ email, role: 'MEMBER' }))
    const body = await res.json()

    expect(body.token).toMatch(/^[0-9a-f]{64}$/)

    const expiresAt = new Date(body.expiresAt)
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    const diff = expiresAt.getTime() - Date.now()
    expect(diff).toBeGreaterThan(sevenDays - 60_000) // within 1 min tolerance
    expect(diff).toBeLessThan(sevenDays + 60_000)
  })

  // I13
  it('I13: inviting an existing workspace member returns 409', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
    // MEMBER_EMAIL is already a workspace member
    const res = await POST(makeReq({ email: MEMBER_EMAIL, role: 'VIEWER' }))
    expect(res.status).toBe(409)
  })
})

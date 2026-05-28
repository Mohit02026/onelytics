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

import { PATCH } from '@/app/api/workspace/members/[id]/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, addUserToWorkspace, cleanupUserByEmail, fakeSession } from './helpers'

const OWNER_EMAIL  = 'role-change-owner@onelytics-test.invalid'
const ADMIN_EMAIL  = 'role-change-admin@onelytics-test.invalid'
const MEMBER_EMAIL = 'role-change-member@onelytics-test.invalid'

let ownerData: Awaited<ReturnType<typeof seedUser>>
let adminUser: Awaited<ReturnType<typeof addUserToWorkspace>>
let memberUser: Awaited<ReturnType<typeof addUserToWorkspace>>
let ownerMemberId: string
let adminMemberId: string
let memberMemberId: string

beforeAll(async () => {
  ownerData  = await seedUser(OWNER_EMAIL, 'OWNER')
  adminUser  = await addUserToWorkspace(ADMIN_EMAIL, ownerData.workspace.id, ownerData.org.id, 'ADMIN')
  memberUser = await addUserToWorkspace(MEMBER_EMAIL, ownerData.workspace.id, ownerData.org.id, 'MEMBER')

  const ownerMember = await testPrisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ownerData.workspace.id, userId: ownerData.user.id } },
  })
  const adminMember = await testPrisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ownerData.workspace.id, userId: adminUser.id } },
  })
  const memberMember = await testPrisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ownerData.workspace.id, userId: memberUser.id } },
  })

  ownerMemberId  = ownerMember!.id
  adminMemberId  = adminMember!.id
  memberMemberId = memberMember!.id
})

afterAll(async () => {
  await cleanupUserByEmail(MEMBER_EMAIL)
  await cleanupUserByEmail(ADMIN_EMAIL)
  await cleanupUserByEmail(OWNER_EMAIL)
})

function makeReq(body: object) {
  return new Request('http://localhost/api/workspace/members/some-id', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/workspace/members/[id]', () => {
  // I24
  it('I24: ADMIN cannot change member roles — returns 403', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(adminUser.id, ownerData.workspace.id) as any)
    const res = await PATCH(makeReq({ role: 'VIEWER' }), { params: { id: memberMemberId } })
    expect(res.status).toBe(403)
  })

  // I25
  it('I25: OWNER cannot change their own role — returns 400', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
    const res = await PATCH(makeReq({ role: 'ADMIN' }), { params: { id: ownerMemberId } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/own role/i)
  })
})

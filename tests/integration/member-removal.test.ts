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

import { DELETE } from '@/app/api/workspace/members/[id]/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, addUserToWorkspace, cleanupUserByEmail, fakeSession } from './helpers'

const OWNER_EMAIL  = 'removal-owner@onelytics-test.invalid'
const ADMIN_EMAIL  = 'removal-admin@onelytics-test.invalid'
const MEMBER_EMAIL = 'removal-member@onelytics-test.invalid'

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
  // member may already be removed by I26, so silently skip
  await testPrisma.workspaceMember.deleteMany({
    where: { workspaceId: ownerData.workspace.id, userId: memberUser.id },
  }).catch(() => {})
  await cleanupUserByEmail(MEMBER_EMAIL)
  await cleanupUserByEmail(ADMIN_EMAIL)
  await cleanupUserByEmail(OWNER_EMAIL)
})

function makeDeleteReq() {
  return new Request('http://localhost/api/workspace/members/some-id', { method: 'DELETE' })
}

describe('DELETE /api/workspace/members/[id]', () => {
  // I26
  it('I26: ADMIN can remove MEMBER — returns 200 and membership is gone', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(adminUser.id, ownerData.workspace.id) as any)
    const res = await DELETE(makeDeleteReq(), { params: { id: memberMemberId } })
    expect(res.status).toBe(200)

    const gone = await testPrisma.workspaceMember.findUnique({ where: { id: memberMemberId } })
    expect(gone).toBeNull()
  })

  // I27
  it('I27: ADMIN cannot remove OWNER — returns 403', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(adminUser.id, ownerData.workspace.id) as any)
    const res = await DELETE(makeDeleteReq(), { params: { id: ownerMemberId } })
    expect(res.status).toBe(403)
  })

  // I28
  it('I28: self-removal returns 400', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(adminUser.id, ownerData.workspace.id) as any)
    const res = await DELETE(makeDeleteReq(), { params: { id: adminMemberId } })
    expect(res.status).toBe(400)
  })
})

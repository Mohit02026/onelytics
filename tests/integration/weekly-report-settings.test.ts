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

import { GET, PATCH } from '@/app/api/workspace/weekly-report/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, addUserToWorkspace, cleanupUserByEmail, fakeSession } from './helpers'

const OWNER_EMAIL = 'wr-owner@onelytics-test.invalid'
const MEMBER_EMAIL = 'wr-member@onelytics-test.invalid'

let ownerData: Awaited<ReturnType<typeof seedUser>>
let memberUser: Awaited<ReturnType<typeof addUserToWorkspace>>

function patchReq(body: unknown) {
  return new Request('http://localhost/api/workspace/weekly-report', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function resetWorkspace() {
  await testPrisma.workspace.update({
    where: { id: ownerData.workspace.id },
    data: { weeklyReportEnabled: false, weeklyReportSenderId: null, weeklyReportRecipients: [] },
  })
  await testPrisma.connectedMailbox.deleteMany({ where: { userId: { in: [ownerData.user.id, memberUser.id] } } })
}

beforeAll(async () => {
  ownerData = await seedUser(OWNER_EMAIL, 'OWNER')
  memberUser = await addUserToWorkspace(MEMBER_EMAIL, ownerData.workspace.id, ownerData.org.id, 'MEMBER')
})

beforeEach(async () => {
  await resetWorkspace()
  vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
})

afterAll(async () => {
  await cleanupUserByEmail(OWNER_EMAIL)
  await cleanupUserByEmail(MEMBER_EMAIL)
})

describe('GET /api/workspace/weekly-report', () => {
  it('I49: returns disabled defaults for an unconfigured workspace', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body).toMatchObject({
      enabled: false,
      recipients: [],
      senderEmail: null,
      viewerMailboxConnected: false,
    })
  })

  it('I50: resolves senderEmail from the sender\'s connected mailbox', async () => {
    await testPrisma.connectedMailbox.create({
      data: {
        userId: ownerData.user.id, provider: 'google', emailAddress: 'owner@sender.com',
        accessToken: 'x', refreshToken: 'x',
      },
    })
    await testPrisma.workspace.update({
      where: { id: ownerData.workspace.id },
      data: { weeklyReportEnabled: true, weeklyReportSenderId: ownerData.user.id },
    })

    const res = await GET()
    const body = await res.json()
    expect(body.senderEmail).toBe('owner@sender.com')
    expect(body.viewerMailboxConnected).toBe(true)
  })
})

describe('PATCH /api/workspace/weekly-report', () => {
  it('I51: MEMBER is forbidden from changing settings', async () => {
    vi.mocked(auth).mockResolvedValue(fakeSession(memberUser.id, ownerData.workspace.id) as any)
    const res = await PATCH(patchReq({ recipients: ['x@example.com'] }))
    expect(res.status).toBe(403)
  })

  it('I52: OWNER can update recipients, lowercased', async () => {
    const res = await PATCH(patchReq({ recipients: ['Client@Example.com', 'seo@Agency.io'] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.recipients).toEqual(['client@example.com', 'seo@agency.io'])
  })

  it('I53: rejects an invalid email in the recipients array', async () => {
    const res = await PATCH(patchReq({ recipients: ['not-an-email'] }))
    expect(res.status).toBe(400)
  })

  it('I54: enabling without a connected mailbox returns 400 and does not enable', async () => {
    const res = await PATCH(patchReq({ enabled: true }))
    expect(res.status).toBe(400)
    const workspace = await testPrisma.workspace.findUnique({ where: { id: ownerData.workspace.id } })
    expect(workspace?.weeklyReportEnabled).toBe(false)
  })

  it('I55: enabling with a connected mailbox sets enabled and assigns the current user as sender', async () => {
    await testPrisma.connectedMailbox.create({
      data: {
        userId: ownerData.user.id, provider: 'google', emailAddress: 'owner@sender.com',
        accessToken: 'x', refreshToken: 'x',
      },
    })

    const res = await PATCH(patchReq({ enabled: true }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.enabled).toBe(true)
    expect(body.weeklyReportSenderId).toBe(ownerData.user.id)
  })

  it('I56: does not overwrite an already-assigned sender on a later enable call', async () => {
    await testPrisma.connectedMailbox.create({
      data: {
        userId: memberUser.id, provider: 'google', emailAddress: 'member@sender.com',
        accessToken: 'x', refreshToken: 'x',
      },
    })
    // Member enables first — becomes sender
    vi.mocked(auth).mockResolvedValue(fakeSession(memberUser.id, ownerData.workspace.id) as any)
    await testPrisma.workspaceMember.updateMany({
      where: { workspaceId: ownerData.workspace.id, userId: memberUser.id },
      data: { role: 'ADMIN' },
    })
    await PATCH(patchReq({ enabled: true }))

    // Owner later toggles recipients — must not steal sender assignment
    vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
    const res = await PATCH(patchReq({ recipients: ['x@example.com'] }))
    const body = await res.json()
    expect(body.weeklyReportSenderId).toBe(memberUser.id)
  })
})

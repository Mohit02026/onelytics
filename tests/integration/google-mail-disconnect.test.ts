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

import { POST } from '@/app/api/integrations/google-mail/disconnect/route'
import { auth } from '@/lib/auth'
import { testPrisma, seedUser, cleanupUserByEmail, fakeSession } from './helpers'

const OWNER_EMAIL = 'gmail-disconnect-owner@onelytics-test.invalid'
let ownerData: Awaited<ReturnType<typeof seedUser>>

async function seedMailbox() {
  await testPrisma.connectedMailbox.deleteMany({ where: { userId: ownerData.user.id } })
  await testPrisma.connectedMailbox.create({
    data: {
      userId: ownerData.user.id,
      provider: 'google',
      emailAddress: 'sender@example.com',
      accessToken: 'encrypted-placeholder',
      refreshToken: 'encrypted-placeholder',
      scope: 'https://www.googleapis.com/auth/gmail.send',
    },
  })
}

beforeAll(async () => {
  ownerData = await seedUser(OWNER_EMAIL, 'OWNER')
})

beforeEach(() => {
  vi.mocked(auth).mockResolvedValue(fakeSession(ownerData.user.id, ownerData.workspace.id) as any)
})

afterAll(async () => {
  await cleanupUserByEmail(OWNER_EMAIL)
})

describe('POST /api/integrations/google-mail/disconnect', () => {
  it('I45: returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('I46: returns 404 when no mailbox is connected', async () => {
    await testPrisma.connectedMailbox.deleteMany({ where: { userId: ownerData.user.id } })
    const res = await POST()
    expect(res.status).toBe(404)
  })

  it('I47: removes the ConnectedMailbox row', async () => {
    await seedMailbox()
    const res = await POST()
    expect(res.status).toBe(200)

    const mailbox = await testPrisma.connectedMailbox.findUnique({
      where: { userId_provider: { userId: ownerData.user.id, provider: 'google' } },
    })
    expect(mailbox).toBeNull()
  })

  it('I48: disabling this user as a workspace\'s report sender clears enabled + senderId', async () => {
    await seedMailbox()
    await testPrisma.workspace.update({
      where: { id: ownerData.workspace.id },
      data: {
        weeklyReportEnabled: true,
        weeklyReportSenderId: ownerData.user.id,
        weeklyReportRecipients: ['client@example.com'],
      },
    })

    await POST()

    const workspace = await testPrisma.workspace.findUnique({ where: { id: ownerData.workspace.id } })
    expect(workspace?.weeklyReportEnabled).toBe(false)
    expect(workspace?.weeklyReportSenderId).toBeNull()
    // Recipients are left intact — only sending is turned off
    expect(workspace?.weeklyReportRecipients).toEqual(['client@example.com'])
  })
})

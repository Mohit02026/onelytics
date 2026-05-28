import { vi, describe, it, expect, afterEach } from 'vitest'

vi.mock('@/lib/db', async () => {
  const { testPrisma } = await import('./helpers')
  return { prisma: testPrisma }
})

import { POST } from '@/app/api/auth/register/route'
import { testPrisma, cleanupUserByEmail } from './helpers'

const EMAIL = 'reg-test@onelytics-test.invalid'
const EMAIL_MIXED = 'Reg-TEST@ONELYTICS-TEST.INVALID'

afterEach(async () => {
  await cleanupUserByEmail(EMAIL)
  await cleanupUserByEmail(EMAIL_MIXED.toLowerCase())
})

function makeReq(body: object) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/register', () => {
  // I1
  it('I1: creates user, workspace, org, and OWNER memberships atomically', async () => {
    const res = await POST(makeReq({ email: EMAIL, password: 'password123', name: 'Test User' }))
    expect(res.status).toBe(201)

    const user = await testPrisma.user.findUnique({ where: { email: EMAIL } })
    expect(user).not.toBeNull()
    expect(user?.organizationId).not.toBeNull()

    const wsMember = await testPrisma.workspaceMember.findFirst({ where: { userId: user!.id } })
    expect(wsMember?.role).toBe('OWNER')

    const orgMember = await testPrisma.orgMember.findFirst({ where: { userId: user!.id } })
    expect(orgMember?.role).toBe('OWNER')
  })

  // I2
  it('I2: returns 400 if email already exists', async () => {
    await POST(makeReq({ email: EMAIL, password: 'password123', name: 'First' }))
    const res = await POST(makeReq({ email: EMAIL, password: 'otherpass', name: 'Second' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/email/i)
  })

  // I3
  it('I3: stores bcrypt hash, not plaintext password', async () => {
    await POST(makeReq({ email: EMAIL, password: 'plaintext123' }))
    const user = await testPrisma.user.findUnique({ where: { email: EMAIL } })
    expect(user?.password).not.toBe('plaintext123')
    expect(user?.password).toMatch(/^\$2[ab]?\$/) // bcrypt hash prefix
  })

  // I4
  it('I4: lowercases email before storage', async () => {
    const res = await POST(makeReq({ email: EMAIL_MIXED, password: 'password123' }))
    expect(res.status).toBe(201)
    const user = await testPrisma.user.findUnique({ where: { email: EMAIL_MIXED.toLowerCase() } })
    expect(user).not.toBeNull()
    expect(user?.email).toBe(EMAIL_MIXED.toLowerCase())
  })

  // I35
  it('I35: failed registration on duplicate email leaves no orphaned workspace or org', async () => {
    // First registration creates workspace and org
    const first = await POST(makeReq({ email: EMAIL, password: 'password123', name: 'First' }))
    expect(first.status).toBe(201)

    const before = await testPrisma.workspace.count()
    const beforeOrg = await testPrisma.organization.count()

    // Duplicate email — should fail
    const second = await POST(makeReq({ email: EMAIL, password: 'otherpass', name: 'Second' }))
    expect(second.status).toBe(400)

    // No extra workspace or org should have been created
    const after = await testPrisma.workspace.count()
    const afterOrg = await testPrisma.organization.count()
    expect(after).toBe(before)
    expect(afterOrg).toBe(beforeOrg)
  })
})

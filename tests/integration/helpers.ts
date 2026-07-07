import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

export const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/onelytics_test'

const adapter = new PrismaPg({ connectionString: TEST_DB_URL })
export const testPrisma = new PrismaClient({ adapter })

/** Deletes a user and all their dependent data by email. Safe to call if user doesn't exist. */
export async function cleanupUserByEmail(email: string) {
  const user = await testPrisma.user.findUnique({
    where: { email },
    select: { id: true, workspaceId: true, organizationId: true },
  })
  if (!user) return

  await testPrisma.workspaceInvite.deleteMany({ where: { workspaceId: user.workspaceId } })
  await testPrisma.connectedAccount.deleteMany({ where: { workspaceId: user.workspaceId } })
  await testPrisma.workspaceMember.deleteMany({ where: { userId: user.id } })
  await testPrisma.orgMember.deleteMany({ where: { userId: user.id } })
  await testPrisma.user.delete({ where: { id: user.id } })
  await testPrisma.workspace.delete({ where: { id: user.workspaceId } }).catch(() => {})
  if (user.organizationId) {
    await testPrisma.organization.delete({ where: { id: user.organizationId } }).catch(() => {})
  }
}

/** Seed a full org → workspace → user → OWNER memberships chain. Returns all created IDs. */
export async function seedUser(email: string, role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' = 'OWNER') {
  const org = await testPrisma.organization.create({ data: { name: `Org for ${email}` } })
  const workspace = await testPrisma.workspace.create({
    data: { name: `WS for ${email}`, organizationId: org.id },
  })
  const user = await testPrisma.user.create({
    data: {
      email,
      password: 'test-hash',
      name: email.split('@')[0],
      workspaceId: workspace.id,
      organizationId: org.id,
      onboarded: true,
    },
  })
  await testPrisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role },
  })
  await testPrisma.orgMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
  })
  return { user, workspace, org }
}

/** Add a second user to an existing workspace with the given role. */
export async function addUserToWorkspace(
  email: string,
  workspaceId: string,
  orgId: string,
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
) {
  const user = await testPrisma.user.create({
    data: {
      email,
      password: 'test-hash',
      name: email.split('@')[0],
      workspaceId,
      organizationId: orgId,
      onboarded: true,
    },
  })
  await testPrisma.workspaceMember.create({
    data: { workspaceId, userId: user.id, role },
  })
  return user
}

/** Fake session object matching the shape routes expect from auth(). */
export function fakeSession(userId: string, workspaceId: string, organizationId: string | null = null) {
  return {
    user: {
      id: userId,
      email: 'test@onelytics-test.invalid',
      name: 'Test User',
      workspaceId,
      organizationId,
      onboarded: true,
      orgRole: undefined,
    },
    expires: new Date(Date.now() + 86400_000).toISOString(),
  }
}

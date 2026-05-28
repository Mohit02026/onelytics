import bcrypt from 'bcryptjs'
import { testPrisma, cleanupUserByEmail } from '../integration/helpers'
import {
  E2E_SIGNUP_EMAIL,
  E2E_USER_A_EMAIL,
  E2E_USER_B_EMAIL,
  E2E_PASSWORD,
} from './constants'

export default async function globalSetup() {
  // Clean up any users left over from a previous run
  await cleanupUserByEmail(E2E_SIGNUP_EMAIL)
  await cleanupUserByEmail(E2E_USER_A_EMAIL)
  await cleanupUserByEmail(E2E_USER_B_EMAIL)

  // Seed User A and User B for the tenant isolation test.
  // These need real bcrypt hashes because they log in via the UI form.
  const hash = await bcrypt.hash(E2E_PASSWORD, 10)

  for (const email of [E2E_USER_A_EMAIL, E2E_USER_B_EMAIL]) {
    const org = await testPrisma.organization.create({
      data: { name: `E2E Org — ${email}` },
    })
    const workspace = await testPrisma.workspace.create({
      data: { name: `E2E Workspace — ${email}`, organizationId: org.id },
    })
    const user = await testPrisma.user.create({
      data: {
        email,
        password: hash,
        name: 'E2E User',
        workspaceId: workspace.id,
        organizationId: org.id,
        onboarded: true,
      },
    })
    await testPrisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' },
    })
    await testPrisma.orgMember.create({
      data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
    })
  }

  await testPrisma.$disconnect()
}

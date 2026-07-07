import { test, expect } from '@playwright/test'
import bcrypt from 'bcryptjs'
import { testPrisma, cleanupUserByEmail } from '../integration/helpers'

/**
 * Invite flow tests.
 *
 * NOTE: Running E2E tests requires the Next.js server started against the test DB:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/onelytics_test" npm run dev
 * Then: npx playwright test
 */

const INVITE_OWNER_EMAIL  = 'e2e-invite-owner@onelytics-test.invalid'
const INVITE_MEMBER_EMAIL = 'e2e-invite-member@onelytics-test.invalid'
const INVITE_PASSWORD     = 'e2einvite123'

/**
 * E5 — Receive invite link → sign in → land on correct workspace.
 *
 * Flow:
 *  1. Seed an OWNER user with a workspace (directly via testPrisma — same pattern as global-setup).
 *  2. Seed a second user (the invitee) who will accept the invite.
 *  3. Create a WorkspaceInvite record directly via testPrisma (no HTTP call needed;
 *     the /api/workspace/invite POST requires an authenticated session which is hard to
 *     obtain in a request context without cookie forwarding).
 *  4. Navigate to /invite/[token] as the invitee (logged in).
 *  5. Click "Accept & Join".
 *  6. Assert redirect to "/" and workspace name visible.
 *
 * Invite page behaviour (from app/invite/[token]/page.tsx):
 *  - If NOT logged in: button shows "Sign in to Accept" and clicking redirects to
 *    /api/auth/signin?callbackUrl=/invite/[token]. No inline register form.
 *  - If logged in: button shows "Accept & Join" and POSTs to /api/invite/[token].
 *  - On success: shows "Joined successfully!" then redirects to "/" after 2 s.
 *
 * The invitee must be logged in before visiting the invite URL. We log in first,
 * then navigate to the invite page.
 */
test('E5: accept invite → land on correct workspace dashboard', async ({ page }) => {
  // --- Seed owner + workspace ---
  const hash = await bcrypt.hash(INVITE_PASSWORD, 10)

  const org = await testPrisma.organization.create({
    data: { name: 'E2E Invite Org' },
  })
  const workspace = await testPrisma.workspace.create({
    data: { name: 'E2E Invite Workspace', organizationId: org.id },
  })
  const owner = await testPrisma.user.create({
    data: {
      email: INVITE_OWNER_EMAIL,
      password: hash,
      name: 'Invite Owner',
      workspaceId: workspace.id,
      organizationId: org.id,
      onboarded: true,
    },
  })
  await testPrisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: owner.id, role: 'OWNER' },
  })
  await testPrisma.orgMember.create({
    data: { organizationId: org.id, userId: owner.id, role: 'OWNER' },
  })

  // --- Seed the invitee user (needs a workspace to exist in; use a placeholder org/ws) ---
  const inviteeOrg = await testPrisma.organization.create({
    data: { name: 'E2E Invitee Org' },
  })
  const inviteeWs = await testPrisma.workspace.create({
    data: { name: 'E2E Invitee WS', organizationId: inviteeOrg.id },
  })
  const invitee = await testPrisma.user.create({
    data: {
      email: INVITE_MEMBER_EMAIL,
      password: hash,
      name: 'Invite Member',
      workspaceId: inviteeWs.id,
      organizationId: inviteeOrg.id,
      onboarded: true,
    },
  })
  await testPrisma.workspaceMember.create({
    data: { workspaceId: inviteeWs.id, userId: invitee.id, role: 'MEMBER' },
  })
  await testPrisma.orgMember.create({
    data: { organizationId: inviteeOrg.id, userId: invitee.id, role: 'MEMBER' },
  })

  // --- Create the invite record directly ---
  const token = 'e2e-invite-token-' + Date.now()
  await testPrisma.workspaceInvite.create({
    data: {
      workspaceId: workspace.id,
      email: INVITE_MEMBER_EMAIL,
      role: 'MEMBER',
      token,
      invitedById: owner.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  try {
    // --- Log in as invitee ---
    await page.goto('/login')
    await page.fill('#email', INVITE_MEMBER_EMAIL)
    await page.fill('#password', INVITE_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard', { timeout: 15_000 })

    // --- Navigate to the invite page ---
    await page.goto(`/invite/${token}`)

    // Invite details card should load — workspace name visible
    await expect(
      page.getByText('E2E Invite Workspace')
    ).toBeVisible({ timeout: 10_000 })

    // The "Accept & Join" button appears when session is present
    const acceptBtn = page.getByRole('button', { name: 'Accept & Join' })
    await expect(acceptBtn).toBeVisible({ timeout: 10_000 })
    await acceptBtn.click()

    // Success state: "Joined successfully!" shown before redirect
    await expect(
      page.getByText('Joined successfully!')
    ).toBeVisible({ timeout: 10_000 })

    // After 2-second delay the page redirects to "/dashboard"
    await page.waitForURL('/dashboard', { timeout: 10_000 })
  } finally {
    // --- Cleanup ---
    await cleanupUserByEmail(INVITE_OWNER_EMAIL)
    await cleanupUserByEmail(INVITE_MEMBER_EMAIL)
    // Remove invite record in case cleanup didn't cascade
    await testPrisma.workspaceInvite.deleteMany({ where: { token } }).catch(() => {})
    await testPrisma.workspace.delete({ where: { id: inviteeWs.id } }).catch(() => {})
    await testPrisma.organization.delete({ where: { id: inviteeOrg.id } }).catch(() => {})
  }
})

import { test, expect } from '@playwright/test'
import bcrypt from 'bcryptjs'
import { testPrisma, cleanupUserByEmail } from '../integration/helpers'

/**
 * E8-E10 — Weekly report email: mailbox connect UI + recipient management.
 *
 * The real Google OAuth consent screen cannot be driven headlessly — these
 * tests verify up to the point of leaving the app (E8), and use a directly
 * seeded ConnectedMailbox row to exercise the "already connected" UI states
 * that would otherwise only be reachable after a real OAuth round trip.
 */

const EMAIL = 'e2e-mailbox-owner@onelytics-test.invalid'
const PASSWORD = 'e2emailbox123'

async function loginAsOwner(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard', { timeout: 15_000 })
}

test.describe('Weekly report — mailbox connect', () => {
  let workspaceId: string
  let userId: string

  test.beforeEach(async () => {
    await cleanupUserByEmail(EMAIL)
    const hash = await bcrypt.hash(PASSWORD, 10)
    const org = await testPrisma.organization.create({ data: { name: 'E2E Mailbox Org' } })
    const workspace = await testPrisma.workspace.create({
      data: { name: 'E2E Mailbox Workspace', organizationId: org.id },
    })
    const user = await testPrisma.user.create({
      data: { email: EMAIL, password: hash, name: 'Mailbox Owner', workspaceId: workspace.id, organizationId: org.id, onboarded: true },
    })
    await testPrisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' } })
    await testPrisma.orgMember.create({ data: { organizationId: org.id, userId: user.id, role: 'OWNER' } })
    workspaceId = workspace.id
    userId = user.id
  })

  test.afterEach(async () => {
    await cleanupUserByEmail(EMAIL)
  })

  test('E8: Connect Gmail button targets Google OAuth with gmail.send scope, never completes the round trip', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/settings/profile')

    let capturedUrl: string | null = null
    await page.route('https://accounts.google.com/**', async (route) => {
      capturedUrl = route.request().url()
      await route.abort()
    })

    await expect(page.getByRole('button', { name: 'Connect Gmail' })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Connect Gmail' }).click()

    await expect.poll(() => capturedUrl, { timeout: 10_000 }).not.toBeNull()
    const url = new URL(capturedUrl!)
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('scope')).toContain('gmail.send')
  })

  test('E9: connected mailbox shows sending address, disconnect returns to Connect Gmail', async ({ page }) => {
    await testPrisma.connectedMailbox.create({
      data: {
        userId, provider: 'google', emailAddress: 'owner@sender.com',
        accessToken: 'x', refreshToken: 'x',
      },
    })

    await loginAsOwner(page)
    await page.goto('/settings/profile')

    await expect(page.getByText('Sending as')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('owner@sender.com')).toBeVisible()

    await page.getByRole('button', { name: 'Disconnect' }).click()
    await expect(page.getByRole('button', { name: 'Connect Gmail' })).toBeVisible({ timeout: 10_000 })

    const mailbox = await testPrisma.connectedMailbox.findUnique({
      where: { userId_provider: { userId, provider: 'google' } },
    })
    expect(mailbox).toBeNull()
  })

  test('E10: recipients can be added and sending enabled once a mailbox is connected', async ({ page }) => {
    await testPrisma.connectedMailbox.create({
      data: {
        userId, provider: 'google', emailAddress: 'owner@sender.com',
        accessToken: 'x', refreshToken: 'x',
      },
    })

    await loginAsOwner(page)
    await page.goto('/reports')

    await expect(page.getByText('Weekly report email')).toBeVisible({ timeout: 10_000 })
    await page.getByPlaceholder('client@example.com').fill('client@example.com')
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('client@example.com')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Turn on' }).click()
    await expect(page.getByRole('button', { name: 'Turn off' })).toBeVisible({ timeout: 10_000 })

    const workspace = await testPrisma.workspace.findUnique({ where: { id: workspaceId } })
    expect(workspace?.weeklyReportEnabled).toBe(true)
    expect(workspace?.weeklyReportRecipients).toEqual(['client@example.com'])
    expect(workspace?.weeklyReportSenderId).toBe(userId)
  })
})

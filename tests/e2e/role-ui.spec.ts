import { test, expect } from '@playwright/test'
import bcrypt from 'bcryptjs'
import { testPrisma, cleanupUserByEmail } from '../integration/helpers'

/**
 * Role-based UI tests.
 *
 * NOTE: Running E2E tests requires the Next.js server started against the test DB:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/onelytics_test" npm run dev
 * Then: npx playwright test
 */

const ROLE_MEMBER_EMAIL = 'e2e-role-member@onelytics-test.invalid'
const ROLE_VIEWER_EMAIL = 'e2e-role-viewer@onelytics-test.invalid'
const ROLE_PASSWORD     = 'e2erole123'

/**
 * E6 — MEMBER cannot access settings admin actions.
 *
 * The settings page (app/(dashboard)/settings/page.tsx) uses:
 *   const canEdit = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN'
 *
 * For a MEMBER:
 *   - canEdit is false → all form inputs are disabled
 *   - The "Save Changes" button is NOT rendered (inside `{canEdit && ...}`)
 *   - The Danger Zone card is NOT rendered (inside `{workspace?.role === 'OWNER' && ...}`)
 *
 * The settings page is still accessible — there is no redirect for MEMBER.
 * We assert that the page loads, the disabled state is correct, and dangerous
 * actions are absent.
 */
test('E6: MEMBER sees settings page but Save Changes and Delete Workspace are absent', async ({ page }) => {
  const hash = await bcrypt.hash(ROLE_PASSWORD, 10)

  const org = await testPrisma.organization.create({
    data: { name: 'E2E Role Member Org' },
  })
  const workspace = await testPrisma.workspace.create({
    data: { name: 'E2E Role Member WS', organizationId: org.id },
  })
  const user = await testPrisma.user.create({
    data: {
      email: ROLE_MEMBER_EMAIL,
      password: hash,
      name: 'Role Member',
      workspaceId: workspace.id,
      organizationId: org.id,
      onboarded: true,
    },
  })
  await testPrisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: 'MEMBER' },
  })
  await testPrisma.orgMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'MEMBER' },
  })

  try {
    // Log in as MEMBER
    await page.goto('/login')
    await page.fill('#email', ROLE_MEMBER_EMAIL)
    await page.fill('#password', ROLE_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 15_000 })

    // Navigate to settings
    await page.goto('/settings')

    // Settings page renders (not redirected away)
    // Use level: 2 to target the settings layout h2 — the navbar also renders an h1 "Settings"
    await expect(
      page.getByRole('heading', { name: 'Settings', level: 2 })
    ).toBeVisible({ timeout: 10_000 })

    // "Your role" text confirms MEMBER role is displayed
    await expect(page.getByText('MEMBER')).toBeVisible()

    // Save Changes button must NOT be rendered for non-canEdit roles
    await expect(
      page.getByRole('button', { name: /save changes/i })
    ).not.toBeVisible()

    // Danger Zone / Delete Workspace must NOT be rendered for non-OWNER
    await expect(
      page.getByRole('button', { name: /delete workspace/i })
    ).not.toBeVisible()

    await expect(
      page.getByText('Danger Zone')
    ).not.toBeVisible()
  } finally {
    await cleanupUserByEmail(ROLE_MEMBER_EMAIL)
  }
})

/**
 * E7 — VIEWER has no Generate Report button (functional block).
 *
 * The reports list page (app/(dashboard)/reports/page.tsx) always renders the
 * "New Report" link/button regardless of role — there is no role check in the
 * UI component itself. The role gate is enforced at the API level only
 * (app/api/reports/route.ts: canGenerateReports blocks VIEWER).
 *
 * The test therefore asserts the end-to-end behaviour:
 *   1. VIEWER can navigate to /reports and see the page.
 *   2. VIEWER can navigate to /reports/new (the form is rendered).
 *   3. Clicking "Generate Report" on the new-report form triggers the API,
 *      which returns 403. The form shows an error message.
 *
 * This is the meaningful assertion — the VIEWER is blocked from actually
 * generating a report, which is what canGenerateReports enforces.
 *
 * TODO (if a future change gates the UI too): update assertion to check that
 * the "New Report" button on /reports is absent or disabled for VIEWER role,
 * and that /reports/new redirects away or renders a "no access" message.
 */
test('E7: VIEWER cannot generate a report — API returns forbidden', async ({ page }) => {
  const hash = await bcrypt.hash(ROLE_PASSWORD, 10)

  const org = await testPrisma.organization.create({
    data: { name: 'E2E Role Viewer Org' },
  })
  const workspace = await testPrisma.workspace.create({
    data: { name: 'E2E Role Viewer WS', organizationId: org.id },
  })
  const user = await testPrisma.user.create({
    data: {
      email: ROLE_VIEWER_EMAIL,
      password: hash,
      name: 'Role Viewer',
      workspaceId: workspace.id,
      organizationId: org.id,
      onboarded: true,
    },
  })
  await testPrisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: 'VIEWER' },
  })
  await testPrisma.orgMember.create({
    data: { organizationId: org.id, userId: user.id, role: 'MEMBER' },
  })

  try {
    // Log in as VIEWER
    await page.goto('/login')
    await page.fill('#email', ROLE_VIEWER_EMAIL)
    await page.fill('#password', ROLE_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 15_000 })

    // Reports list page is accessible
    await page.goto('/reports')
    // Use level: 2 to target the reports page h2 — the navbar also renders an h1 "Reports"
    await expect(
      page.getByRole('heading', { name: 'Reports', level: 2 })
    ).toBeVisible({ timeout: 10_000 })

    // Navigate to the new report form
    await page.goto('/reports/new')
    await expect(
      page.getByRole('heading', { name: 'New Report' })
    ).toBeVisible({ timeout: 10_000 })

    // Fill in the minimum required fields so client-side validation passes
    await page.fill('input[placeholder*="Performance Report"]', 'Test Report')

    // Click Generate Report — this triggers POST /api/reports which returns 403 for VIEWER
    await page.getByRole('button', { name: 'Generate Report' }).click()

    // The form surfaces the API error message
    // app/api/reports/route.ts returns { error: 'Forbidden' } with status 403
    // The new-report page sets setError(data.error ?? 'Failed to generate report.')
    await expect(
      page.getByText(/forbidden|failed to generate report/i)
    ).toBeVisible({ timeout: 10_000 })

    // Confirm we did NOT navigate away to a report page
    await expect(page).toHaveURL(/\/reports\/new/)
  } finally {
    await cleanupUserByEmail(ROLE_VIEWER_EMAIL)
  }
})

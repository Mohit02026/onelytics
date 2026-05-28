import { test, expect } from '@playwright/test'
import { E2E_SIGNUP_EMAIL, E2E_USER_NAME, E2E_PASSWORD } from './constants'

/**
 * E1 + E2 — Signup → dashboard empty state (single browser session)
 *
 * E1 and E2 are combined into one test because they are one continuous user
 * journey. Playwright gives each test a fresh browser context, so E2 cannot
 * inherit E1's session if they are separate tests.
 *
 * Pre-condition: global-setup has deleted any leftover E2E_SIGNUP_EMAIL user.
 */
test('E1+E2: signup lands on dashboard and shows empty state for fresh account', async ({ page }) => {
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()

  await page.fill('#name',     E2E_USER_NAME)
  await page.fill('#email',    E2E_SIGNUP_EMAIL)
  await page.fill('#password', E2E_PASSWORD)
  await page.click('button[type="submit"]')

  // E1: redirect to dashboard after successful signup + auto-signin
  await page.waitForURL('/', { timeout: 15_000 })

  // E2: fresh account with no integrations shows the empty-state CTA
  await expect(
    page.getByRole('heading', { name: 'Welcome to Onelytics' })
  ).toBeVisible({ timeout: 15_000 })

  await expect(
    page.getByRole('link', { name: /connect integrations/i })
  ).toBeVisible()
})

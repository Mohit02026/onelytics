import { test, expect } from '@playwright/test'
import { E2E_USER_A_EMAIL, E2E_PASSWORD } from './constants'

/**
 * Auth error tests.
 *
 * NOTE: Running E2E tests requires the Next.js server started against the test DB:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/onelytics_test" npm run dev
 * Then: npx playwright test
 */

/**
 * E4 — Login with wrong password shows error, does not crash.
 *
 * Uses the seeded E2E_USER_A_EMAIL (created in global-setup) with a wrong password.
 * After a failed sign-in, NextAuth returns an error and the page sets the error state.
 * The error <p> is rendered with the text "Invalid email or password."
 */
test('E4: login with wrong password shows inline error and stays on /login', async ({ page }) => {
  await page.goto('/login')

  // Confirm the login page loaded correctly
  await expect(page.getByRole('heading', { name: 'Sign in to Onelytics' })).toBeVisible()

  await page.fill('#email', E2E_USER_A_EMAIL)
  await page.fill('#password', 'definitely-wrong-password')
  await page.click('button[type="submit"]')

  // Error message must appear — exact text from login/page.tsx line 32
  await expect(
    page.getByText('Invalid email or password.')
  ).toBeVisible({ timeout: 10_000 })

  // Must still be on /login — no redirect happened
  await expect(page).toHaveURL(/\/login/)

  // Page must not be blank — heading is still present
  await expect(page.getByRole('heading', { name: 'Sign in to Onelytics' })).toBeVisible()
})

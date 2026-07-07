import type { Page } from '@playwright/test'

/** Log in via the /login form and wait for the dashboard to load. */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard', { timeout: 15_000 })
}

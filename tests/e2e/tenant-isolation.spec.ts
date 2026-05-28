import { test, expect } from '@playwright/test'
import { login } from './helpers'
import { E2E_USER_A_EMAIL, E2E_USER_B_EMAIL, E2E_PASSWORD } from './constants'

/**
 * E3 — Tenant isolation
 *
 * User A logs in. GET /api/workspace/members uses session.user.workspaceId
 * server-side, so User A can only ever see their own workspace members —
 * regardless of what the client does.
 *
 * Pre-condition: global-setup has seeded User A and User B in separate workspaces.
 */
test('E3: authenticated user only sees their own workspace members', async ({ page }) => {
  await login(page, E2E_USER_A_EMAIL, E2E_PASSWORD)

  // Hit the members API while authenticated as User A
  const response = await page.request.get('/api/workspace/members')
  expect(response.status()).toBe(200)

  const body = await response.json()
  const emails: string[] = body.members.map(
    (m: { user: { email: string } }) => m.user.email
  )

  // User A's own email is present
  expect(emails).toContain(E2E_USER_A_EMAIL)

  // User B's email is NOT present — different workspace entirely
  expect(emails).not.toContain(E2E_USER_B_EMAIL)
})

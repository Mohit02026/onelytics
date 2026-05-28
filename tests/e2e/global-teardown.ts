import { testPrisma, cleanupUserByEmail } from '../integration/helpers'
import { E2E_SIGNUP_EMAIL, E2E_USER_A_EMAIL, E2E_USER_B_EMAIL } from './constants'

export default async function globalTeardown() {
  await cleanupUserByEmail(E2E_SIGNUP_EMAIL)
  await cleanupUserByEmail(E2E_USER_A_EMAIL)
  await cleanupUserByEmail(E2E_USER_B_EMAIL)
  await testPrisma.$disconnect()
}

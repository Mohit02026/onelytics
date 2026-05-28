import { describe, it, expect, vi } from 'vitest'

// Mock lib/db before importing workspace to prevent PrismaPg pool creation
vi.mock('@/lib/db', () => ({ prisma: {} }))

import {
  canManageMembers,
  canEdit,
  canGenerateReports,
  canConnectIntegrations,
} from '@/lib/workspace'

describe('canManageMembers', () => {
  it('U7: OWNER → true', () => expect(canManageMembers('OWNER')).toBe(true))
  it('U8: ADMIN → true', () => expect(canManageMembers('ADMIN')).toBe(true))
  it('U9: MEMBER → false', () => expect(canManageMembers('MEMBER')).toBe(false))
  it('U10: VIEWER → false', () => expect(canManageMembers('VIEWER')).toBe(false))
})

describe('canEdit', () => {
  it('U11: OWNER → true', () => expect(canEdit('OWNER')).toBe(true))
  it('U12: ADMIN → true', () => expect(canEdit('ADMIN')).toBe(true))
  it('U13: MEMBER → true', () => expect(canEdit('MEMBER')).toBe(true))
  it('U14: VIEWER → false', () => expect(canEdit('VIEWER')).toBe(false))
})

describe('canGenerateReports', () => {
  it('U15: OWNER → true', () => expect(canGenerateReports('OWNER')).toBe(true))
  it('U16: ADMIN → true', () => expect(canGenerateReports('ADMIN')).toBe(true))
  it('U17: MEMBER → true', () => expect(canGenerateReports('MEMBER')).toBe(true))
  it('U18: VIEWER → false', () => expect(canGenerateReports('VIEWER')).toBe(false))
})

describe('canConnectIntegrations', () => {
  it('U19: OWNER → true', () => expect(canConnectIntegrations('OWNER')).toBe(true))
  it('U20: ADMIN → true', () => expect(canConnectIntegrations('ADMIN')).toBe(true))
  it('U21: MEMBER → false', () => expect(canConnectIntegrations('MEMBER')).toBe(false))
  it('U22: VIEWER → false', () => expect(canConnectIntegrations('VIEWER')).toBe(false))
})

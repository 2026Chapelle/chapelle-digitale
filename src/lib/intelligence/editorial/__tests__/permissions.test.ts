import { describe, expect, it } from 'vitest'
import { canReadEditorialIntelligence, canWriteEditorialIntelligence } from '../permissions'

describe('editorial permissions', () => {
  const worldAdminActor = {
    highestRole: 'world_admin' as const,
    memberships: [] as any[],
  } as any

  const editorialManagerProfile = { role: 'editorial_manager' }

  it('grants read and write to world admins and super admins', () => {
    expect(canReadEditorialIntelligence(worldAdminActor, null)).toBe(true)
    expect(canWriteEditorialIntelligence(worldAdminActor, null)).toBe(true)
  })

  it('grants read and write to the delegated editorial manager role without world privileges', () => {
    expect(canReadEditorialIntelligence({ highestRole: 'staff', memberships: [] } as any, editorialManagerProfile.role)).toBe(true)
    expect(canWriteEditorialIntelligence({ highestRole: 'staff', memberships: [] } as any, editorialManagerProfile.role)).toBe(true)
  })

  it('does not grant write to a pastor without editorial permission', () => {
    expect(canReadEditorialIntelligence({ highestRole: 'staff', memberships: [] } as any, 'pasteur')).toBe(false)
    expect(canWriteEditorialIntelligence({ highestRole: 'staff', memberships: [] } as any, 'pasteur')).toBe(false)
  })
})

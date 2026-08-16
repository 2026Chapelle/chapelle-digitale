import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import { hashInviteToken, generateInviteToken } from '@/lib/erp/unit-governance-rpc'
import { INVITATION_TTL_MS, normalizeEmail, isInvitableRole } from '@/lib/erp/unit-governance-rules'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Lot 6 — invite token & contracts', () => {
  it('token hash SHA-256 stable', () => {
    const t = 'test-token-value'
    expect(hashInviteToken(t)).toBe(createHash('sha256').update(t, 'utf8').digest('hex'))
  })

  it('generateInviteToken fort (longueur)', () => {
    const a = generateInviteToken()
    const b = generateInviteToken()
    expect(a.length).toBeGreaterThanOrEqual(32)
    expect(a).not.toBe(b)
  })

  it('TTL 7j et email normalisé', () => {
    expect(INVITATION_TTL_MS).toBe(604800000)
    expect(normalizeEmail('  X@Y.Z ')).toBe('x@y.z')
  })

  it('world_super_admin non invitable', () => {
    expect(isInvitableRole('world_super_admin')).toBe(false)
  })

  it('routes invite preview/accept et email template existent', () => {
    const root = process.cwd()
    expect(() =>
      readFileSync(join(root, 'src/app/api/invite/unit/preview/route.ts'), 'utf8'),
    ).not.toThrow()
    expect(() =>
      readFileSync(join(root, 'src/app/api/invite/unit/accept/route.ts'), 'utf8'),
    ).not.toThrow()
    const tpl = readFileSync(join(root, 'src/lib/email-templates-unit-governance.ts'), 'utf8')
    expect(tpl).toContain('unitGovernanceInviteEmail')
    const invRoute = readFileSync(
      join(root, 'src/app/api/admin/organization-unit-invitations/route.ts'),
      'utf8',
    )
    expect(invRoute).toContain('email_sent')
    expect(invRoute).toContain('sendEmail')
  })

  it('safe-redirect allowlist invite/unit', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/auth/safe-redirect.ts'), 'utf8')
    expect(src).toContain("'/invite/unit'")
  })
})

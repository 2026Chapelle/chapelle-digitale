import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATION = join(
  process.cwd(),
  'supabase/migrations/20260717120000_citadelle_erp_lot6_unit_governance.sql',
)

describe('Lot 6 — migration static security', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('transaction unique BEGIN/COMMIT', () => {
    expect(sql).toMatch(/^\s*BEGIN\s*;/m)
    expect(sql.trim().endsWith('COMMIT;') || sql.includes('\nCOMMIT;')).toBe(true)
  })

  it('tables invitations + events + colonnes membership', () => {
    expect(sql).toContain('CREATE TABLE public.organization_unit_invitations')
    expect(sql).toContain('CREATE TABLE public.organization_unit_governance_events')
    expect(sql).toContain('nominated_by')
    expect(sql).toContain('suspended_at')
    expect(sql).toContain('removed_at')
  })

  it('statuts invitation exacts sans accepted', () => {
    expect(sql).toContain("'pending', 'expired', 'revoked', 'consumed'")
    expect(sql).not.toMatch(/CHECK \(status IN \([^)]*'accepted'/)
  })

  it('TTL invitation max 7 jours au niveau SQL', () => {
    expect(sql).toMatch(/expires_at\s*>\s*created_at/)
    expect(sql).toMatch(
      /expires_at\s*<=\s*created_at\s*\+\s*interval\s+'7 days'/i,
    )
    expect(sql).toContain('organization_unit_invitations_expires_after_create')
  })

  it('journal append-only triggers', () => {
    expect(sql).toContain('organization_unit_governance_events_no_update')
    expect(sql).toContain('organization_unit_governance_events_no_delete')
    expect(sql).toContain('is append-only')
  })

  it('RLS FORCE + pas de GRANT authenticated', () => {
    expect(sql).toContain('FORCE ROW LEVEL SECURITY')
    expect(sql).not.toMatch(
      /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.organization_unit_invitations\s+TO\s+authenticated/i,
    )
    expect(sql).not.toMatch(
      /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.organization_unit_governance_events\s+TO\s+authenticated/i,
    )
  })

  it('RPC atomiques service_role only', () => {
    for (const fn of [
      'erp_unit_membership_nominate',
      'erp_unit_membership_set_status',
      'erp_unit_membership_change_role',
      'erp_unit_membership_transfer',
      'erp_unit_invitation_accept',
    ]) {
      expect(sql).toContain(fn)
      expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}`))
    }
    expect(sql).toContain('cannot demote last world_super_admin')
    expect(sql).toContain('self-promotion forbidden')
  })

  it('FK composite + ON DELETE RESTRICT history', () => {
    expect(sql).toContain('organization_unit_invitations_unit_org_fk')
    expect(sql).toContain('ON DELETE RESTRICT')
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FIX = join(
  process.cwd(),
  'supabase/migrations/20260717123000_citadelle_erp_lot6_governance_security_fix.sql',
)
const LOT5 = join(
  process.cwd(),
  'supabase/migrations/20260716180000_citadelle_erp_lot5_organization_units.sql',
)
const LOT6 = join(
  process.cwd(),
  'supabase/migrations/20260717120000_citadelle_erp_lot6_unit_governance.sql',
)

describe('Lot 6 — security fix static', () => {
  const fix = readFileSync(FIX, 'utf8')
  const lot5 = readFileSync(LOT5, 'utf8')
  const lot6 = readFileSync(LOT6, 'utf8')

  it('transaction unique BEGIN/COMMIT', () => {
    expect(fix).toMatch(/^\s*BEGIN\s*;/m)
    expect(fix.includes('\nCOMMIT;') || fix.trim().endsWith('COMMIT;')).toBe(true)
  })

  it('UNIQUE composite source (organization_id, id) sur invitations', () => {
    expect(fix).toContain('organization_unit_invitations_org_id_uidx')
    expect(fix).toMatch(
      /UNIQUE\s*\(\s*organization_id\s*,\s*id\s*\)/i,
    )
  })

  it('FK invitation composite + ON DELETE RESTRICT', () => {
    expect(fix).toContain('DROP CONSTRAINT IF EXISTS organization_unit_governance_events_invitation_fk')
    expect(fix).toMatch(
      /FOREIGN KEY\s*\(\s*organization_id\s*,\s*invitation_id\s*\)/i,
    )
    expect(fix).toMatch(
      /REFERENCES\s+public\.organization_unit_invitations\s*\(\s*organization_id\s*,\s*id\s*\)/i,
    )
    expect(fix).toMatch(/ON DELETE RESTRICT/i)
  })

  it('helpers Lot 6 : REVOKE PUBLIC/anon/authenticated + GRANT service_role', () => {
    const helpers = [
      'erp_unit_role_rank(text)',
      'erp_unit_role_fits_type(text, text)',
      'erp_actor_highest_role(uuid, uuid)',
      'erp_actor_can_write_unit(uuid, uuid, uuid)',
      'erp_assignable_roles(text)',
      'erp_count_active_super(uuid)',
    ]
    for (const sig of helpers) {
      expect(fix).toMatch(
        new RegExp(
          `REVOKE ALL ON FUNCTION public\\.${sig.replace(/[()]/g, '\\$&').replace(/, /g, ',\\s*')} FROM PUBLIC,\\s*anon,\\s*authenticated`,
          'i',
        ),
      )
      expect(fix).toMatch(
        new RegExp(
          `GRANT EXECUTE ON FUNCTION public\\.${sig.replace(/[()]/g, '\\$&').replace(/, /g, ',\\s*')} TO service_role`,
          'i',
        ),
      )
    }
    // aucune GRANT EXECUTE helper vers authenticated/anon
    expect(fix).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.erp_unit_role_rank\([^)]+\) TO (authenticated|anon)/i,
    )
    expect(fix).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.erp_actor_can_write_unit\([^)]+\) TO (authenticated|anon)/i,
    )
  })

  it('cinq RPC mutation restent service_role only', () => {
    const rpcs = [
      'erp_unit_membership_nominate(uuid, uuid, uuid, text, uuid, text)',
      'erp_unit_membership_set_status(uuid, text, uuid, text)',
      'erp_unit_membership_change_role(uuid, text, uuid)',
      'erp_unit_membership_transfer(uuid, uuid, uuid, text)',
      'erp_unit_invitation_accept(text, uuid, text)',
    ]
    for (const sig of rpcs) {
      const esc = sig.replace(/[()]/g, '\\$&').replace(/, /g, ',\\s*')
      expect(fix).toMatch(
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${esc} FROM PUBLIC,\\s*anon,\\s*authenticated`, 'i'),
      )
      expect(fix).toMatch(
        new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${esc} TO service_role`, 'i'),
      )
    }
  })

  it('preuve Lot 5 : materialized_path slash-terminated', () => {
    expect(lot5).toContain("NEW.materialized_path := '/' || NEW.id::text || '/'")
    expect(lot5).toContain(
      'NEW.materialized_path := parent_rec.materialized_path || NEW.id::text ||',
    )
    // descendant sous séparateur '/'
    expect(lot5).toContain("parent_rec.materialized_path || NEW.id::text || '/'")
  })

  it('frontière path dans erp_actor_can_write_unit (rtrim + /%)', () => {
    expect(fix).toContain('CREATE OR REPLACE FUNCTION public.erp_actor_can_write_unit')
    expect(fix).toMatch(
      /LIKE\s+rtrim\s*\(\s*m\.materialized_path\s*,\s*'\/'\s*\)\s*\|\|\s*'\/%'/i,
    )
    // l'ancien préfixe nu ne doit plus être la seule forme dans le fix
    expect(fix).not.toMatch(
      /LIKE\s+m\.materialized_path\s*\|\|\s*'%'\s*THEN/i,
    )
  })

  it('migration originale Lot 6 non réécrite pour le fix', () => {
    // original still has prefix form; fix is additive
    expect(lot6).toMatch(/LIKE m\.materialized_path \|\| '%'/)
    expect(fix).toContain('20260717123000')
    expect(fix).toContain('security fix')
  })
})

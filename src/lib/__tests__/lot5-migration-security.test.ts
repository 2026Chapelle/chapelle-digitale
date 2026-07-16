/**
 * Lot 5 correction — tests statiques de la migration SQL
 * (pas d'exécution Supabase : preuve textuelle du draft).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATION = join(
  process.cwd(),
  'supabase/migrations/20260716180000_citadelle_erp_lot5_organization_units.sql',
)

describe('Lot 5 — migration security static review', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('transaction atomique BEGIN/COMMIT unique', () => {
    expect(sql).toMatch(/^\s*BEGIN\s*;/m)
    expect(sql).toMatch(/^\s*COMMIT\s*;/m)
    const begins = (sql.match(/^\s*BEGIN\s*;/gm) || []).length
    expect(begins).toBeGreaterThanOrEqual(1)
    expect(sql.trim().endsWith('COMMIT;') || sql.includes('\nCOMMIT;')).toBe(true)
  })

  it('RLS activée et forcée sur les 6 tables sensibles', () => {
    const tables = [
      'organization_units',
      'organization_unit_members',
      'organization_settings',
      'organization_unit_settings',
      'pastoral_journey_templates',
      'pastoral_journey_template_steps',
    ]
    for (const t of tables) {
      expect(sql).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`)
      expect(sql).toContain(`ALTER TABLE public.${t} FORCE ROW LEVEL SECURITY`)
    }
  })

  it('aucun GRANT SELECT à authenticated sur tables Lot 5', () => {
    expect(sql).not.toMatch(
      /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.organization_units\s+TO\s+authenticated/i,
    )
    expect(sql).not.toMatch(
      /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.organization_unit_members\s+TO\s+authenticated/i,
    )
    expect(sql).not.toMatch(
      /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.organization_settings\s+TO\s+authenticated/i,
    )
    expect(sql).not.toMatch(
      /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.organization_unit_settings\s+TO\s+authenticated/i,
    )
    expect(sql).not.toMatch(
      /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.pastoral_journey_templates\s+TO\s+authenticated/i,
    )
    expect(sql).not.toMatch(
      /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.pastoral_journey_template_steps\s+TO\s+authenticated/i,
    )
  })

  it('aucune policy SELECT permissive erp_org_has_active_membership sur tables Lot 5', () => {
    expect(sql).not.toMatch(
      /CREATE POLICY organization_units_select_member[\s\S]*erp_org_has_active_membership/,
    )
    expect(sql).not.toMatch(
      /CREATE POLICY organization_settings_select_member[\s\S]*erp_org_has_active_membership/,
    )
    expect(sql).not.toMatch(
      /CREATE POLICY organization_unit_settings_select_member[\s\S]*erp_org_has_active_membership/,
    )
    expect(sql).not.toMatch(
      /CREATE POLICY pastoral_templates_select_member[\s\S]*erp_org_has_active_membership/,
    )
  })

  it('REVOKE ALL à anon et authenticated sur tables Lot 5', () => {
    for (const t of [
      'organization_units',
      'organization_unit_members',
      'organization_settings',
      'organization_unit_settings',
      'pastoral_journey_templates',
      'pastoral_journey_template_steps',
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `REVOKE ALL ON TABLE public\\.${t} FROM PUBLIC, anon, authenticated`,
          'i',
        ),
      )
    }
  })

  it('service_role conserve GRANT ALL', () => {
    expect(sql).toMatch(/GRANT ALL ON TABLE public\.organization_units TO service_role/i)
    expect(sql).toMatch(/GRANT ALL ON TABLE public\.organization_settings TO service_role/i)
  })

  it('trigger hiérarchique BEFORE INSERT OR UPDATE présent', () => {
    expect(sql).toContain('erp_organization_units_before_write')
    expect(sql).toMatch(
      /CREATE TRIGGER organization_units_hierarchy_before_write\s+BEFORE INSERT OR UPDATE ON public\.organization_units/,
    )
  })

  it('trigger refuse cross-org, cycle, self-parent, types invalides', () => {
    expect(sql).toContain('cross-org interdit')
    expect(sql).toContain('cycle hiérarchique interdit')
    expect(sql).toContain('self-parent interdit')
    expect(sql).toContain('continental_zone doit être sous world_headquarters')
    expect(sql).toContain('national_central_church doit être sous continental_zone')
    expect(sql).toContain('local_church doit être sous national_central_church')
    expect(sql).toContain('attributs structurels immuables')
  })

  it('path et depth recalculés serveur dans le trigger', () => {
    expect(sql).toContain("NEW.materialized_path := '/' || NEW.id::text || '/'")
    expect(sql).toContain(
      'NEW.materialized_path := parent_rec.materialized_path || NEW.id::text ||',
    )
    expect(sql).toContain('NEW.depth := parent_rec.depth + 1')
    expect(sql).toContain('NEW.depth := 0')
  })

  it('seed HQ → Afrique → CI sans local fictif', () => {
    expect(sql).toContain("'world-hq'")
    expect(sql).toContain("'zone-afrique'")
    expect(sql).toContain("'eglise-centrale-ci'")
    expect(sql).toContain('Aucune église locale fictive')
    expect(sql).toContain("unit_type = 'local_church'")
  })

  it('import newcomer_journey_steps + step_key stable (exact copy)', () => {
    expect(sql).toContain('FROM public.newcomer_journey_steps s')
    expect(sql).toContain('s.step_key')
    expect(sql).toContain('s.label')
    expect(sql).toContain('s.sort_order')
  })

  it('une seule HQ par organisation (index + trigger)', () => {
    expect(sql).toContain('organization_units_one_hq_per_org')
    expect(sql).toContain('une seule world_headquarters par organisation')
  })

  // ── Correction finale avant SQL ──────────────────────────────────────────

  it('absence totale des quatre clés fallback codées en dur', () => {
    // Ancien fallback inventé interdit
    expect(sql).not.toMatch(/\(v_tpl,\s*'received'/i)
    expect(sql).not.toMatch(/\(v_tpl,\s*'first_contact'/i)
    expect(sql).not.toMatch(/\(v_tpl,\s*'follow_up'/i)
    expect(sql).not.toMatch(/\(v_tpl,\s*'integrated'/i)
    expect(sql).not.toContain("'Fiche reçue'")
    expect(sql).not.toContain("'Premier contact'")
    expect(sql).not.toContain("'Relance'")
    expect(sql).not.toContain("'Intégré'")
    // Pas de branche fallback IF NOT EXISTS insert inventé
    expect(sql).not.toMatch(
      /IF NOT EXISTS\s*\(\s*SELECT 1 FROM public\.pastoral_journey_template_steps/i,
    )
  })

  it('dépendance fail-fast au référentiel pastoral', () => {
    expect(sql).toContain("to_regclass('public.newcomer_journey_steps') IS NULL")
    expect(sql).toContain('newcomer_journey_steps is missing')
    expect(sql).toContain('has no valid step')
    expect(sql).toContain('contains empty step_key')
    expect(sql).toContain('incompatible duplicate step_key')
    expect(sql).toContain('incompatible duplicate sort_order')
  })

  it('absence des colonnes dupliquées dans organization_units', () => {
    // Extraire le CREATE TABLE organization_units seulement
    const m = sql.match(
      /CREATE TABLE public\.organization_units\s*\(([\s\S]*?)\n\);/,
    )
    expect(m).toBeTruthy()
    const body = m![1]
    expect(body).not.toMatch(/\baddress\b/)
    expect(body).not.toMatch(/\btimezone\b/)
    expect(body).not.toMatch(/\bdefault_locale\b/)
    expect(body).not.toMatch(/\bdefault_currency\b/)
    expect(body).not.toMatch(/\bcontact_email\b/)
    expect(body).not.toMatch(/\bcontact_phone\b/)
    // Structurelles conservées (city = identité structurelle)
    expect(body).toMatch(/\bcity\b/)
    expect(body).toMatch(/\borganization_id\b/)
    expect(body).toMatch(/\bparent_id\b/)
    expect(body).toMatch(/\bunit_type\b/)
    expect(body).toMatch(/\bmaterialized_path\b/)
    expect(body).toMatch(/\bdepth\b/)
  })

  it('city structurelle SSOT : units oui, settings non', () => {
    const units = sql.match(
      /CREATE TABLE public\.organization_units\s*\(([\s\S]*?)\n\);/,
    )
    const settings = sql.match(
      /CREATE TABLE public\.organization_unit_settings\s*\(([\s\S]*?)\n\);/,
    )
    expect(units).toBeTruthy()
    expect(settings).toBeTruthy()
    expect(units![1]).toMatch(/\bcity\b/)
    expect(settings![1]).not.toMatch(/\bcity\b/)
    // INSERT settings sans city
    expect(sql).toMatch(
      /INSERT INTO public\.organization_unit_settings\s*\(\s*organization_unit_id,\s*organization_id,\s*timezone,\s*default_locale,\s*default_currency\s*\)/,
    )
    expect(sql).not.toMatch(
      /INSERT INTO public\.organization_unit_settings\s*\([^)]*\bcity\b/,
    )
  })

  it('présence des paramètres dans organization_unit_settings (seed direct)', () => {
    expect(sql).toContain('CREATE TABLE public.organization_unit_settings')
    expect(sql).toMatch(
      /INSERT INTO public\.organization_unit_settings\s*\(\s*organization_unit_id,\s*organization_id,\s*timezone,\s*default_locale,\s*default_currency/,
    )
    // Interdit : copier depuis organization_units
    expect(sql).not.toMatch(
      /SELECT u\.id,\s*u\.organization_id,\s*u\.timezone,\s*u\.default_locale,\s*u\.default_currency/i,
    )
    expect(sql).toContain('jamais copiés depuis organization_units')
  })

  it('clé candidate organization_units (organization_id, id)', () => {
    expect(sql).toMatch(
      /CONSTRAINT organization_units_org_id_unique\s+UNIQUE\s*\(\s*organization_id\s*,\s*id\s*\)/,
    )
  })

  it('FK composite memberships', () => {
    expect(sql).toContain('organization_unit_members_unit_org_fk')
    expect(sql).toMatch(
      /FOREIGN KEY\s*\(\s*organization_id\s*,\s*organization_unit_id\s*\)\s*REFERENCES public\.organization_units\s*\(\s*organization_id\s*,\s*id\s*\)\s*ON DELETE CASCADE/,
    )
  })

  it('FK composite settings', () => {
    expect(sql).toContain('organization_unit_settings_unit_org_fk')
    expect(sql).toMatch(
      /CONSTRAINT organization_unit_settings_unit_org_fk[\s\S]*?FOREIGN KEY\s*\(\s*organization_id\s*,\s*organization_unit_id\s*\)\s*REFERENCES public\.organization_units\s*\(\s*organization_id\s*,\s*id\s*\)\s*ON DELETE CASCADE/,
    )
  })

  it('FK composite newcomer intakes', () => {
    expect(sql).toContain('newcomer_intakes_unit_org_fk')
    expect(sql).toMatch(
      /ADD CONSTRAINT newcomer_intakes_unit_org_fk\s+FOREIGN KEY\s*\(\s*organization_id\s*,\s*organization_unit_id\s*\)\s*REFERENCES public\.organization_units\s*\(\s*organization_id\s*,\s*id\s*\)\s*ON DELETE RESTRICT/,
    )
  })

  it('refus cross-organization prouvable au niveau SQL (FK composites)', () => {
    // Les trois tables enfants lient (organization_id, organization_unit_id)
    expect(sql).toContain('organization_unit_members_unit_org_fk')
    expect(sql).toContain('organization_unit_settings_unit_org_fk')
    expect(sql).toContain('newcomer_intakes_unit_org_fk')
    // Plus de simple REFERENCES organization_units(id) seul pour members/settings
    expect(sql).not.toMatch(
      /organization_unit_id\s+uuid\s+NOT NULL\s+REFERENCES public\.organization_units\(id\)/i,
    )
  })

  it('détection réelle d’un cycle indirect (parcours chaîne ancêtres + path)', () => {
    expect(sql).toContain('WITH RECURSIVE anc AS')
    expect(sql).toContain('is_cycle')
    expect(sql).toMatch(/a\.walk_id\s*=\s*ANY\s*\(\s*a\.path\s*\)/)
    expect(sql).toContain("ARRAY[u.id]::uuid[] AS path")
    // SQL échappe l'apostrophe : d''ancêtres
    expect(sql).toContain("cycle hiérarchique détecté (chaîne d''ancêtres)")
  })

  it('cohérence exacte des materialized paths', () => {
    expect(sql).toContain("materialized_path IS DISTINCT FROM ('/' || u.id::text || '/')")
    expect(sql).toContain(
      'parent.materialized_path || child.id::text ||',
    )
    expect(sql).toContain('materialized_path HQ incohérent')
    expect(sql).toContain('materialized_path enfant incohérent')
    // Ne se contente pas du motif /%/
    expect(sql).not.toMatch(
      /materialized_path\s+!~\s*'/,
    )
  })
})

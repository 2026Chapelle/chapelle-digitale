import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * PARCOURS DU ROYAUME — garde de sécurité STATIQUE des migrations canoniques
 * (20260820170000 persistence + 20260820180000 3C validation). Ces invariants sont la
 * colonne vertébrale sécurité du modèle 4 axes ; ils n'étaient couverts par AUCUN test.
 * Analyse du SQL uniquement (aucune base requise), à l'image de lot6-migration-security.
 */

const MIG_DIR = join(process.cwd(), 'supabase/migrations')
const persistence = readFileSync(join(MIG_DIR, '20260820170000_parcours_canonical_persistence.sql'), 'utf8')
const validation = readFileSync(join(MIG_DIR, '20260820180000_parcours_3c_validation.sql'), 'utf8')

const CANONICAL_TABLES = [
  'member_canonical_axes',
  'member_ministry_roles',
  'member_canonical_axis_changes',
]

describe('Migration canonique — RLS deny-by-default', () => {
  it('RLS ENABLE + FORCE sur chaque table sensible', () => {
    for (const t of CANONICAL_TABLES) {
      expect(persistence).toContain(`alter table public.${t} enable row level security`)
      expect(persistence).toContain(`alter table public.${t} force row level security`)
    }
  })

  it('REVOKE ALL from anon (+ authenticated pour les tables privées)', () => {
    for (const t of CANONICAL_TABLES) {
      expect(persistence).toMatch(new RegExp(`revoke all on public\\.${t} from anon, authenticated`))
    }
  })

  it('écriture réservée à service_role (jamais anon/authenticated)', () => {
    for (const t of CANONICAL_TABLES) {
      expect(persistence).toMatch(new RegExp(`grant [^\\n]*on public\\.${t} to service_role`))
      expect(persistence).not.toMatch(new RegExp(`grant [^\\n]*insert[^\\n]*on public\\.${t} to authenticated`))
    }
  })

  it('AUCUNE policy « own » : le membre ne lit jamais ses lignes de base (lecture = responsable pastoral seulement)', () => {
    // La seule SELECT policy sur les tables privées est bornée par is_pastoral_responsable_of.
    expect(persistence).toContain('mca_select_responsable on public.member_canonical_axes for select to authenticated')
    expect(persistence).toContain('is_pastoral_responsable_of(profile_id)')
    // Pas de self-read direct type auth.uid() = profile_id sur les axes de base.
    expect(persistence).not.toMatch(/member_canonical_axes[\s\S]{0,120}using\s*\(\s*auth\.uid\(\)\s*=\s*profile_id/i)
  })
})

describe('Migration canonique — journal append-only + audit obligatoire', () => {
  it('triggers no_update / no_delete sur member_canonical_axis_changes', () => {
    expect(persistence).toContain('trg_mcac_no_update')
    expect(persistence).toContain('trg_mcac_no_delete')
    expect(persistence).toContain('member_canonical_axis_changes is append-only')
  })

  it('CHECK : une validation pastorale exige acteur + justification', () => {
    expect(persistence).toContain('mcac_pastoral_requires_actor_and_reason')
  })
})

describe('Migration 3C — RPC validate_member_canonical_axis (fail-closed)', () => {
  it('SECURITY DEFINER', () => {
    expect(validation).toMatch(/create or replace function public\.validate_member_canonical_axis[\s\S]*?security definer/i)
  })

  it('anti-usurpation : auth.uid() <> p_actor_id => NOT_AUTHORIZED', () => {
    expect(validation).toMatch(/auth\.uid\(\)\s*is not null\s*and\s*auth\.uid\(\)\s*<>\s*p_actor_id/)
    expect(validation).toContain('NOT_AUTHORIZED')
  })

  it('portée pastorale vérifiée (acteur responsable du membre)', () => {
    expect(validation).toContain('is_pastoral_responsable_of')
    expect(validation).toMatch(/acteur non responsable du membre/)
  })

  it('EXECUTE révoqué de public/anon', () => {
    expect(validation).toMatch(/revoke all on function public\.validate_member_canonical_axis\([^)]*\) from public, anon/)
  })
})

describe('Migration 3C — vue de revue sans contournement RLS', () => {
  it('security_invoker=true + non accessible à anon/authenticated', () => {
    expect(validation).toContain('security_invoker = true')
    expect(validation).toContain('revoke all on public.member_canonical_review_queue from anon, authenticated')
    expect(validation).toContain('grant select on public.member_canonical_review_queue to service_role')
  })
})

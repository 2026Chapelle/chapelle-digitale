/**
 * Phase 3B — tests du modèle applicatif canonique (repository, ministry, journey-service).
 * Purs, aucune DB, aucune écriture. Prouvent : fallback NO_CANONICAL_ROW, lecture ligne
 * canonique, multi-rôle ministériel, MinistryRole ≠ RBAC, readiness sans promotion.
 */
import { describe, it, expect } from 'vitest'
import { resolveCanonicalMemberView, type CanonicalAxesRow } from '@/lib/canonical/repository'
import { buildMemberJourneyBundle } from '@/lib/canonical/journey-service'
import {
  MINISTRY_ROLE_REGISTRY, ministryRequiresHumanValidation, isKnownMinistryRole,
} from '@/lib/canonical/ministry'
import { can, getPermissions } from '@/lib/permissions'

describe('Repository — fallback NO_CANONICAL_ROW & lecture ligne canonique', () => {
  it('aucune ligne canonique → fallback legacy (source legacy_fallback), legacy reste actif', () => {
    const v = resolveCanonicalMemberView(null, { membre_statut: 'visiteur' })
    expect(v.source).toBe('legacy_fallback')
    expect(v.growth).toEqual({ level: 'visitor', confidence: 'confirmed' })
  })

  it('membre_actif sans ligne canonique → growth requires_review (jamais disciple)', () => {
    const v = resolveCanonicalMemberView(null, { membre_statut: 'membre_actif' })
    expect(v.growth.level).toBeNull()
    expect(v.growth.confidence).toBe('requires_review')
  })

  it('ligne canonique présente → source canonical, valeurs de la ligne', () => {
    const row: CanonicalAxesRow = {
      profile_id: 'p1', growth_level: 'disciple', growth_review_state: 'confirmed',
      community_status: 'member', community_review_state: 'confirmed',
      provenance: 'pastoral_validation', validated_by: 'admin1', validated_at: '2026-08-19T00:00:00Z',
    }
    const v = resolveCanonicalMemberView(row, { membre_statut: 'membre_actif' })
    expect(v.source).toBe('canonical')
    expect(v.growth).toEqual({ level: 'disciple', confidence: 'confirmed' })
    expect(v.community).toEqual({ status: 'member', confidence: 'confirmed' })
  })

  it('valeur DB inconnue → level null (jamais fabriqué)', () => {
    const row: CanonicalAxesRow = {
      profile_id: 'p1', growth_level: 'archange', growth_review_state: 'requires_review',
      community_status: null, community_review_state: 'requires_review',
      provenance: 'import', validated_by: null, validated_at: null,
    }
    const v = resolveCanonicalMemberView(row, {})
    expect(v.growth.level).toBeNull()
  })

  it('affectations ministérielles actives fusionnées (multi-rôle)', () => {
    const v = resolveCanonicalMemberView(null, { membre_statut: 'visiteur' }, [
      { role_key: 'mentor', status: 'active', assigned_at: 'x', assigned_by: null, ended_at: null, provenance: null, note: null },
      { role_key: 'cell_leader', status: 'active', assigned_at: 'x', assigned_by: null, ended_at: null, provenance: null, note: null },
      { role_key: 'servant', status: 'ended', assigned_at: 'x', assigned_by: null, ended_at: 'y', provenance: null, note: null },
    ])
    expect(v.ministry_roles).toEqual(expect.arrayContaining(['mentor', 'cell_leader']))
    expect(v.ministry_roles).not.toContain('servant') // ended
  })
})

describe('Ministry — registre & requires_human_validation (informatif, non habilitant)', () => {
  it('registre : 8 rôles, clés EN connues', () => {
    expect(MINISTRY_ROLE_REGISTRY).toHaveLength(8)
    for (const key of ['mentor', 'cell_leader', 'team_leader', 'servant', 'trainer', 'integration_lead', 'shepherd', 'pastor']) {
      expect(isKnownMinistryRole(key)).toBe(true)
    }
  })

  it('rôles d’autorité → requires_human_validation=true', () => {
    expect(ministryRequiresHumanValidation('shepherd')).toBe(true)
    expect(ministryRequiresHumanValidation('pastor')).toBe(true)
    expect(ministryRequiresHumanValidation('cell_leader')).toBe(true)
    expect(ministryRequiresHumanValidation('mentor')).toBe(false)
  })
})

describe('MinistryRole ≠ RBAC — aucune permission accordée par un rôle ministériel', () => {
  it('une clé ministérielle utilisée comme role n’accorde AUCUNE permission', () => {
    for (const key of ['shepherd', 'pastor', 'cell_leader', 'mentor']) {
      expect(can(key, 'can_respond_pastoral')).toBe(false)
      expect(can(key, 'can_view_all_parcours')).toBe(false)
      expect(can(key, 'can_access_admin')).toBe(false)
    }
  })

  it('getPermissions ne dépend que de role/membre_statut (un membre reste sans perms élevées)', () => {
    const perms = getPermissions({ role: 'membre' })
    expect(perms.has('can_respond_pastoral')).toBe(false)
    expect(perms.has('can_view_all_parcours')).toBe(false)
    // l'override pédagogique berger reste piloté par membre_statut/role, jamais par ministry
    expect(getPermissions({ membre_statut: 'berger' }).has('can_view_all_parcours')).toBe(true)
  })
})

describe('Journey service — bundle read-only, jamais PROMOTED', () => {
  it('compose vue + readiness + signaux sans mutation', () => {
    const view = resolveCanonicalMemberView(null, { membre_statut: 'membre_actif' })
    const bundle = buildMemberJourneyBundle({
      member_id: 'm1',
      view,
      readinessInput: {
        member_id: 'm1', current_statut: 'membre_actif',
        completed_parcours_slug: 'je-stabilise-ma-foi',
        parcours: [{ slug: 'je-stabilise-ma-foi', complete: true, done: 6, total: 6 }],
      },
    })
    expect(bundle.readiness.status).toBe('READY_FOR_REVIEW')
    expect(['NOT_READY', 'READY_FOR_REVIEW']).toContain(bundle.readiness.status)
    expect(bundle.view.source).toBe('legacy_fallback')
    // aucune promotion : la vue n'a pas été mutée par la readiness
    expect(bundle.view.growth.confidence).toBe('requires_review')
  })
})

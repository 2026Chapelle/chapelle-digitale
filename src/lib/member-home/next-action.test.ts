import { describe, expect, it } from 'vitest'
import { resolveMemberNextAction } from '@/lib/member-home/next-action'

const integration = (overrides = {}) => ({ parcours: [], current_slug: null as string | null, integration_complete: false, ...overrides })
const formation = (overrides = {}) => ({ formation_id: 'formation-id', progression: 0, statut: 'actif', dernier_acces: null as string | null, formation: { titre: 'Formation test', slug: 'formation-test' }, ...overrides })

describe('resolveMemberNextAction', () => {
  it('chooses a genuine available unfinished integration step first', () => {
    const result = resolveMemberNextAction({ integration: integration({ current_slug: 'nouveau-croyant', parcours: [{ slug: 'nouveau-croyant', titre: 'Nouveau croyant', pct: 86, complete: false, locked: false }] }), formations: [formation({ progression: 45 })] })
    expect(result).toMatchObject({ kind: 'integration', label: 'Continuer Nouveau croyant', href: '/member/dashboard/formations/nouveau-croyant', progress: 86 })
    expect(result.reason).toContain('prochaine étape disponible')
  })

  it('returns the most recently active unfinished formation when integration has no next step', () => {
    const result = resolveMemberNextAction({ integration: integration(), formations: [formation({ formation_id: 'old', progression: 80, dernier_acces: '2026-08-01T10:00:00.000Z', formation: { titre: 'Ancienne formation', slug: 'ancienne' } }), formation({ formation_id: 'recent', progression: 35, dernier_acces: '2026-09-01T10:00:00.000Z', formation: { titre: 'Formation récente', slug: 'recente' } })] })
    expect(result).toMatchObject({ kind: 'formation', label: 'Continuer Formation récente', href: '/member/dashboard/formations/recente', progress: 35 })
  })

  it('does not select completed formations', () => {
    const result = resolveMemberNextAction({ integration: integration(), formations: [formation({ progression: 100 }), formation({ formation_id: 'done', progression: 10, statut: 'termine' })] })
    expect(result.kind).toBe('fallback')
  })

  it('prefers a started unfinished formation over an unrelated not-started formation', () => {
    const result = resolveMemberNextAction({ integration: integration(), formations: [formation({ formation_id: 'new', progression: 0, dernier_acces: '2026-09-02T10:00:00.000Z', formation: { titre: 'Nouvelle formation', slug: 'nouvelle' } }), formation({ formation_id: 'started', progression: 5, dernier_acces: '2026-08-01T10:00:00.000Z', formation: { titre: 'Formation commencée', slug: 'commencee' } })] })
    expect(result).toMatchObject({ kind: 'formation', label: 'Continuer Formation commencée', href: '/member/dashboard/formations/commencee', progress: 5 })
  })

  it('returns a safe fallback when no eligible integration or formation exists', () => {
    expect(resolveMemberNextAction({ integration: integration(), formations: [] })).toEqual({ kind: 'fallback', label: 'Voir mon parcours', reason: 'Retrouve les étapes disponibles de ton parcours.', href: '/member/dashboard/parcours', priority: 999 })
  })

  it('only returns bounded real progress', () => {
    expect(resolveMemberNextAction({ integration: integration(), formations: [formation({ progression: 140 })] }).progress).toBeUndefined()
  })

  it('always returns an explainable reason and a member href', () => {
    const result = resolveMemberNextAction({ integration: integration(), formations: [formation({ progression: 25 })] })
    expect(result.reason.length).toBeGreaterThan(0)
    expect(result.href.startsWith('/member/dashboard/')).toBe(true)
  })
})

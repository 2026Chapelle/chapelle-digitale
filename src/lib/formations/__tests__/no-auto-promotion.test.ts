import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { computeCommunityIntegration } from '@/lib/formations/statut-progression'

/**
 * PARCOURS DU ROYAUME — invariant : ACCÈS COMMUNAUTAIRE AUTO ≠ PROMOTION SPIRITUELLE AUTO.
 *
 * La complétion d'un parcours ne promeut JAMAIS automatiquement la CROISSANCE (Disciple,
 * membre_actif, …) : cela relève de la validation HUMAINE canonique. La SEULE transition
 * automatique tolérée est l'intégration communautaire visiteur → nouveau_membre (accès
 * aux contenus membres), qui ne touche ni growth_level, ni ministère, ni RBAC.
 */
const ROUTE = join(process.cwd(), 'src/app/api/member/formations/progress/route.ts')
const src = readFileSync(ROUTE, 'utf8')

describe('progress/route.ts — aucune promotion de croissance automatique', () => {
  it('n’utilise plus computeStatutUpgrade (montée de croissance) ni notifyStatusReached', () => {
    expect(src).not.toContain('computeStatutUpgrade')
    expect(src).not.toContain('notifyStatusReached')
  })

  it('la seule écriture de statut passe par computeCommunityIntegration (appartenance)', () => {
    expect(src).toContain('computeCommunityIntegration')
    // L'update de membre_statut n'écrit que la valeur calculée (jamais un littéral growth).
    expect(src).toMatch(/membre_statut:\s*communaute/)
    expect(src).not.toMatch(/membre_statut:\s*['"]disciple['"]/)
    expect(src).not.toMatch(/membre_statut:\s*['"]membre_actif['"]/)
  })

  it('documente l’invariant accès communautaire ≠ promotion spirituelle', () => {
    expect(src).toMatch(/accès communautaire auto ≠ promotion/i)
    expect(src).toContain('member-readiness')
    expect(src).toMatch(/READY_FOR_REVIEW ≠ PROMOTED/)
  })

  it('conserve le fait pédagogique (module_completions) et le certificat', () => {
    expect(src).toContain('module_completions')
    expect(src).toContain('certificats')
  })
})

describe('computeCommunityIntegration — visiteur → nouveau_membre uniquement', () => {
  it('promeut un visiteur à nouveau_membre au parcours d’accueil', () => {
    expect(computeCommunityIntegration('visiteur', 'nouveau-croyant')).toBe('nouveau_membre')
    expect(computeCommunityIntegration(null, 'nouveau-croyant')).toBe('nouveau_membre')
  })

  it('ne promeut JAMAIS la croissance (parcours à cible disciple/membre_actif → null)', () => {
    expect(computeCommunityIntegration('visiteur', 'je-stabilise-ma-foi')).toBeNull()
    expect(computeCommunityIntegration('visiteur', 'je-decouvre-la-maison')).toBeNull()
    expect(computeCommunityIntegration('visiteur', 'je-deviens-disciple-actif')).toBeNull()
  })

  it('n’agit que depuis visiteur (jamais au-delà)', () => {
    expect(computeCommunityIntegration('nouveau_membre', 'nouveau-croyant')).toBeNull()
    expect(computeCommunityIntegration('membre_actif', 'nouveau-croyant')).toBeNull()
    expect(computeCommunityIntegration('disciple', 'nouveau-croyant')).toBeNull()
  })

  it('slug hors barème → null', () => {
    expect(computeCommunityIntegration('visiteur', 'un-parcours-quelconque')).toBeNull()
    expect(computeCommunityIntegration('visiteur', null)).toBeNull()
  })

  it('ne renvoie jamais autre chose que nouveau_membre ou null', () => {
    const outputs = new Set<string | null>()
    for (const s of ['visiteur', null, 'nouveau_membre', 'membre_actif', 'disciple']) {
      for (const slug of ['nouveau-croyant', 'je-decouvre-la-maison', 'je-stabilise-ma-foi', 'x']) {
        outputs.add(computeCommunityIntegration(s as string | null, slug))
      }
    }
    expect(Array.from(outputs).every((v) => v === null || v === 'nouveau_membre')).toBe(true)
  })
})

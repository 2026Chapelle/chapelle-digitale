import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * PARCOURS DU ROYAUME — garde ANTI-RÉGRESSION : la complétion d'un parcours ne doit
 * JAMAIS promouvoir automatiquement le statut spirituel du membre. La reconnaissance de
 * croissance passe exclusivement par la validation HUMAINE auditée (RPC canonique).
 * Garde statique sur la route de progression (source) — indépendante de l'exécution.
 */
const ROUTE = join(process.cwd(), 'src/app/api/member/formations/progress/route.ts')
const src = readFileSync(ROUTE, 'utf8')

describe('progress/route.ts — aucune montée automatique de statut', () => {
  it('n’écrit jamais profiles.membre_statut', () => {
    expect(src).not.toMatch(/from\(['"]profiles['"]\)\s*\.update\(\{\s*membre_statut/)
  })

  it('n’insère plus dans membre_statut_history sur complétion', () => {
    expect(src).not.toContain('membre_statut_history')
  })

  it('n’utilise plus computeStatutUpgrade ni notifyStatusReached', () => {
    expect(src).not.toContain('computeStatutUpgrade')
    expect(src).not.toContain('notifyStatusReached')
  })

  it('documente explicitement la règle canonique + readiness en lecture', () => {
    expect(src).toMatch(/AUCUNE montée AUTOMATIQUE/i)
    expect(src).toContain('member-readiness')
    expect(src).toMatch(/READY_FOR_REVIEW ≠ PROMOTED/)
  })

  it('conserve le fait pédagogique (module_completions) et le certificat', () => {
    expect(src).toContain('module_completions')
    expect(src).toContain('certificats')
  })
})

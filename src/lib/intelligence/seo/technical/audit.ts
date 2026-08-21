/**
 * CITADELLE INTELLIGENCE HUB — SEO · Audit technique on-page (PUR)
 *
 * ⚠️ STUB DE COORDINATION (chantier 1 remplit l'implémentation).
 * La SIGNATURE exportée `auditTechnicalSeo` est stable : l'agrégateur du cockpit
 * (chantier 4) et la route technique l'importent dès maintenant. Le chantier 1
 * remplace le corps par l'analyse réelle (routes du sitemap, robots, canonicals,
 * JSON-LD, noindex des routes privées) SANS changer la signature.
 *
 * Fonction PURE : aucune I/O. Les faits observés (routes, présence sitemap,
 * postures robots…) sont fournis en entrée par l'appelant.
 */

import type { TechnicalSeoMatrix } from '../types'

export interface TechnicalAuditInput {
  /** Instant de génération (ISO), injecté pour rester déterministe. */
  nowIso: string
  /** Base publique déployée (NEXT_PUBLIC_APP_URL résolu). */
  baseUrl: string
}

/**
 * Construit la TECHNICAL_SEO_MATRIX. STUB : matrice vide/neutre tant que le
 * chantier 1 n'a pas branché l'analyse réelle.
 */
export function auditTechnicalSeo(input: TechnicalAuditInput): TechnicalSeoMatrix {
  return {
    generatedAt: input.nowIso,
    routes: [],
    summary: { total: 0, indexable: 0, withIssues: 0, critical: 0, high: 0 },
    checks: {
      metadata: 'NA',
      canonicals: 'NA',
      robots: 'NA',
      sitemap: 'NA',
      jsonLd: 'NA',
      privateRoutesNoindex: 'NA',
    },
  }
}

/**
 * PLATEFORMES officielles de Citadelle — constante centrale (source unique).
 * Mappe les 8 valeurs de l'enum `plateforme_id` vers leurs libellés officiels.
 * + helpers PURS pour le Dashboard Plateforme (P3) : RBAC + agrégation.
 *
 * Note mapping : l'enum contient `chapelle-familiale` et `familles-chapelle`.
 * Par décision projet (« Académie remplace Familiale »), `chapelle-familiale`
 * correspond à « Académie des Élus ».
 */
import { isAdmin, isNational } from '@/lib/roles'
import { classifyActivity } from '@/lib/pastoral/metrics'

export interface Platform { slug: string; label: string }

export const PLATFORMS: Platform[] = [
  { slug: 'cier', label: 'CIER' },
  { slug: 'mahanaim', label: 'Mahanaïm' },
  { slug: 'familles-chapelle', label: 'Familles de la Chapelle' },
  { slug: 'femmes-exceptions', label: "Femmes d'Exceptions" },
  { slug: 'jeunesse', label: 'Jeunesse de la Chapelle' },
  { slug: 'cite-refuge', label: 'Cité du Refuge' },
  { slug: 'cfic', label: 'CFIC' },
  { slug: 'chapelle-familiale', label: 'Académie des Élus' },
]

export const PLATFORM_SLUGS = PLATFORMS.map((p) => p.slug)

export function platformLabel(slug?: string | null): string {
  const p = PLATFORMS.find((x) => x.slug === slug)
  return p ? p.label : (slug || '—')
}

export function isValidPlatform(slug?: string | null): boolean {
  return !!slug && PLATFORM_SLUGS.includes(slug)
}

// ── RBAC (PUR) ────────────────────────────────────────────────────────────────
export type PlatformScope = 'all' | 'nation' | 'denied'

/** Portée d'accès au Dashboard Plateforme (réutilise les axes RBAC existants). */
export function resolvePlatformScope(opts: { role?: string | null; hasNationAssignment?: boolean }): PlatformScope {
  if (isAdmin(opts.role)) return 'all'
  if (opts.hasNationAssignment || isNational(opts.role)) return 'nation'
  return 'denied'
}

// ── Agrégation membres par plateforme (PUR) ─────────────────────────────────────
export interface PlatformMemberRow { plateforme_principale?: string | null; score_engagement?: number | null; derniere_connexion?: string | null }
export interface PlatformMemberStats { membres: number; engagement_moyen: number; actifs: number; retention: number }

/** Agrège membres / engagement moyen / actifs (30 j) par plateforme — réutilise classifyActivity. */
export function aggregatePlatformMembers(rows: PlatformMemberRow[], nowMs: number): Map<string, PlatformMemberStats> {
  const acc = new Map<string, { membres: number; scoreSum: number; actifs: number }>()
  for (const r of rows) {
    const key = r.plateforme_principale || '—'
    const a = acc.get(key) || { membres: 0, scoreSum: 0, actifs: 0 }
    a.membres++
    a.scoreSum += Number(r.score_engagement) || 0
    if (classifyActivity(r.derniere_connexion, nowMs) === 'actif') a.actifs++
    acc.set(key, a)
  }
  const out = new Map<string, PlatformMemberStats>()
  for (const [key, a] of Array.from(acc)) {
    out.set(key, {
      membres: a.membres,
      engagement_moyen: a.membres ? Math.round(a.scoreSum / a.membres) : 0,
      actifs: a.actifs,
      retention: a.membres ? Math.round((a.actifs / a.membres) * 100) : 0,
    })
  }
  return out
}

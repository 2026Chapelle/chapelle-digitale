/**
 * CITADELLE INTELLIGENCE HUB — SEO · Détecteur d'opportunités (PUR)
 *
 * `detectOpportunities` applique des RÈGLES DÉTERMINISTES (aucun score, aucune
 * boîte noire) sur les données déjà normalisées (Search Console + audit
 * technique) pour proposer des actions SEO priorisées. Fonction PURE : aucune
 * I/O, entièrement testable.
 *
 * Chaque opportunité explicite POURQUOI (`why`), la PREUVE chiffrée (`evidence`)
 * et l'ACTION (`action`). Les seuils sont des constantes nommées et justifiées.
 * Une entrée vide/partielle (connecteur non configuré) ne produit QUE des
 * opportunités dérivables des sources présentes — jamais de donnée inventée.
 */

import type {
  GscQueryRow,
  GscPageRow,
  UrlInspectionResult,
  SitemapInfo,
  TechnicalSeoMatrix,
  SeoOpportunity,
  SeoSeverity,
} from './types'
import { IMPORTANT_ROUTES } from './important-routes'

/* ------------------------------------------------------------------ */
/* Seuils justifiés                                                    */
/* ------------------------------------------------------------------ */

/**
 * Volume d'impressions minimal pour qu'une requête « vaille » une action.
 * En-dessous, le signal est trop faible (bruit statistique).
 */
const HIGH_IMPRESSIONS_MIN = 100
/**
 * CTR plafond considéré « anormalement bas ». À une position de page 1
 * (<= 10), un CTR sous 2 % traduit un titre/description peu incitatifs :
 * la page est vue mais ne convertit pas le clic.
 */
const LOW_CTR_MAX = 0.02
/** Position plafond (page 1) au-delà de laquelle un CTR bas est « normal ». */
const CTR_POSITION_CEILING = 10.5
/**
 * Fenêtre « striking distance » : positions 4→15. Assez proches du top pour
 * qu'un petit gain (contenu, maillage) bascule en page 1 / top 3.
 */
const STRIKING_MIN = 4
const STRIKING_MAX = 15
/** Impressions minimales pour retenir une requête en striking distance. */
const STRIKING_IMPRESSIONS_MIN = 10
/** Recul relatif minimal (−20 %) pour qualifier une page « en déclin ». */
const DECLINE_DELTA = -0.2
/** Impressions minimales pour retenir un déclin (évite le bruit). */
const DECLINE_IMPRESSIONS_MIN = 20
/** Progression relative minimale (+50 %) pour signaler une requête montante. */
const RISING_DELTA = 0.5
/** Nombre maximal d'items retenus par type (payload borné, tri déterministe). */
const MAX_PER_KIND = 25

/* ------------------------------------------------------------------ */
/* Entrée                                                              */
/* ------------------------------------------------------------------ */

export interface OpportunityInput {
  queries?: ReadonlyArray<GscQueryRow>
  pages?: ReadonlyArray<GscPageRow>
  indexation?: ReadonlyArray<UrlInspectionResult>
  sitemaps?: ReadonlyArray<SitemapInfo>
  technical?: TechnicalSeoMatrix | null
}

/* ------------------------------------------------------------------ */
/* Utilitaires purs                                                    */
/* ------------------------------------------------------------------ */

const pct = (ratio: number) => `${(ratio * 100).toFixed(1)} %`
const signedPct = (ratio: number) => `${ratio >= 0 ? '+' : ''}${(ratio * 100).toFixed(0)} %`
const num = (n: number) => n.toLocaleString('fr-FR')

/** Chemin normalisé (sans slash final, sans query) d'une URL ou d'un path. */
function pathOf(u: string): string {
  let p = u
  try {
    p = new URL(u).pathname
  } catch {
    const q = u.indexOf('?')
    p = q >= 0 ? u.slice(0, q) : u
  }
  p = p.replace(/\/+$/, '')
  return p === '' ? '/' : p
}

/** Normalise une URL canonique pour comparaison (chemin + host, sans slash final). */
function canonicalKey(u: string): string {
  try {
    const url = new URL(u)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    return `${url.host.toLowerCase()}${path}`
  } catch {
    return u.replace(/\/+$/, '')
  }
}

/** Map chemin important -> métadonnées (importance, shouldIndex). */
const IMPORTANT_BY_PATH = new Map(
  IMPORTANT_ROUTES.map((r) => [pathOf(r.path), r] as const),
)

/** Détecte un état de couverture « non indexé » à partir des libellés Google. */
function looksNotIndexed(r: UrlInspectionResult): boolean {
  if (r.verdict === 'FAIL') return true
  const cov = (r.coverageState ?? '').toLowerCase()
  if (!cov) return false
  // Motifs déterministes connus de l'API URL Inspection / de son libellé FR.
  return (
    cov.includes('not indexed') ||
    cov.includes('non index') ||
    cov.includes('excluded') ||
    cov.includes('exclu') ||
    cov.includes('discovered') ||
    cov.includes('crawled - currently not indexed')
  )
}

const SEVERITY_RANK: Record<SeoSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

/* ------------------------------------------------------------------ */
/* Détecteur                                                           */
/* ------------------------------------------------------------------ */

export function detectOpportunities(input: OpportunityInput): SeoOpportunity[] {
  const queries = input.queries ?? []
  const pages = input.pages ?? []
  const indexation = input.indexation ?? []
  const sitemaps = input.sitemaps ?? []
  const technical = input.technical ?? null

  const out: SeoOpportunity[] = []
  const push = (o: SeoOpportunity) => out.push(o)

  /* 1. HIGH_IMPRESSIONS_LOW_CTR — requêtes très vues, peu cliquées. */
  {
    const hits = queries
      .filter(
        (q) =>
          q.impressions >= HIGH_IMPRESSIONS_MIN &&
          q.ctr < LOW_CTR_MAX &&
          q.position <= CTR_POSITION_CEILING,
      )
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, MAX_PER_KIND)
    for (const q of hits) {
      push({
        kind: 'HIGH_IMPRESSIONS_LOW_CTR',
        severity: q.impressions >= HIGH_IMPRESSIONS_MIN * 5 ? 'high' : 'medium',
        subject: q.query,
        why: 'Beaucoup d’impressions mais très peu de clics : le titre et la méta-description n’incitent pas au clic.',
        evidence: `${num(q.impressions)} impressions · CTR ${pct(q.ctr)} · position ${q.position.toFixed(1)}`,
        action: 'Réécrire le title et la meta description de la page cible pour cette requête (bénéfice/promesse claire).',
      })
    }
  }

  /* 2. POSITION_4_TO_15 — requêtes « à portée » du top. */
  {
    const hits = queries
      .filter(
        (q) =>
          q.position >= STRIKING_MIN &&
          q.position <= STRIKING_MAX &&
          q.impressions >= STRIKING_IMPRESSIONS_MIN,
      )
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, MAX_PER_KIND)
    for (const q of hits) {
      push({
        kind: 'POSITION_4_TO_15',
        severity: 'medium',
        subject: q.query,
        why: 'Position en « striking distance » (4→15) : un petit gain peut faire basculer la requête en page 1 / top 3.',
        evidence: `Position ${q.position.toFixed(1)} · ${num(q.impressions)} impressions · ${num(q.clicks)} clics`,
        action: 'Renforcer le contenu et le maillage interne de la page cible sur cette requête.',
      })
    }
  }

  /* 3. DECLINING_PAGE — pages en recul marqué. */
  {
    const hits = pages
      .filter(
        (p) =>
          p.trend === 'down' &&
          typeof p.delta === 'number' &&
          p.delta <= DECLINE_DELTA &&
          p.impressions >= DECLINE_IMPRESSIONS_MIN,
      )
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
      .slice(0, MAX_PER_KIND)
    for (const p of hits) {
      const delta = p.delta as number
      push({
        kind: 'DECLINING_PAGE',
        severity: delta <= -0.4 ? 'high' : 'medium',
        subject: p.page,
        why: 'Performance en baisse nette par rapport à la période précédente : perte de visibilité à surveiller.',
        evidence: `Variation ${signedPct(delta)} · ${num(p.clicks)} clics · ${num(p.impressions)} impressions · position ${p.position.toFixed(1)}`,
        action: 'Auditer la page (contenu obsolète, cannibalisation, perte de liens) et rafraîchir/mettre à jour.',
      })
    }
  }

  /* 4. RISING_QUERY — requêtes montantes ou nouvelles. */
  {
    const hits = queries
      .filter(
        (q) =>
          q.trend === 'new' ||
          (q.trend === 'up' && typeof q.delta === 'number' && q.delta >= RISING_DELTA),
      )
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, MAX_PER_KIND)
    for (const q of hits) {
      const isNew = q.trend === 'new'
      push({
        kind: 'RISING_QUERY',
        severity: 'info',
        subject: q.query,
        why: isNew
          ? 'Nouvelle requête émergente : opportunité de capter une demande naissante.'
          : 'Requête en forte progression : momentum à amplifier.',
        evidence: isNew
          ? `Nouvelle · ${num(q.impressions)} impressions · position ${q.position.toFixed(1)}`
          : `${signedPct(q.delta as number)} · ${num(q.impressions)} impressions · position ${q.position.toFixed(1)}`,
        action: 'Créer ou renforcer un contenu dédié à cette requête pour convertir la traction en trafic.',
      })
    }
  }

  /* 5. UNINDEXED_IMPORTANT_PAGE — page pilier non indexée. */
  {
    let count = 0
    for (const r of indexation) {
      if (count >= MAX_PER_KIND) break
      const route = IMPORTANT_BY_PATH.get(pathOf(r.url))
      if (!route || !route.shouldIndex) continue
      if (!looksNotIndexed(r)) continue
      count++
      push({
        kind: 'UNINDEXED_IMPORTANT_PAGE',
        severity: route.importance === 'primary' ? 'critical' : 'high',
        subject: pathOf(r.url),
        why: 'Page importante non indexée par Google : elle est invisible dans la recherche.',
        evidence: `Verdict ${r.verdict}${r.coverageState ? ` · ${r.coverageState}` : ''}${r.robotsTxtState ? ` · robots ${r.robotsTxtState}` : ''}`,
        action: 'Vérifier robots/noindex/canonical, corriger le blocage puis demander une (ré)indexation dans Search Console.',
      })
    }
  }

  /* 6. CANONICAL_MISMATCH — canonique Google ≠ canonique déclarée. */
  {
    let count = 0
    for (const r of indexation) {
      if (count >= MAX_PER_KIND) break
      if (!r.googleCanonical || !r.userCanonical) continue
      if (canonicalKey(r.googleCanonical) === canonicalKey(r.userCanonical)) continue
      count++
      push({
        kind: 'CANONICAL_MISMATCH',
        severity: 'high',
        subject: pathOf(r.url),
        why: 'Google a choisi une canonique différente de celle déclarée par la page : signaux d’indexation ambigus.',
        evidence: `Déclarée ${r.userCanonical} · retenue par Google ${r.googleCanonical}`,
        action: 'Aligner la balise canonique déclarée sur l’URL cible réelle (ou corriger le contenu dupliqué).',
      })
    }
  }

  /* 7. SITEMAP_ISSUE — sitemap en erreur ou en attente. */
  {
    const hits = sitemaps
      .filter((s) => (s.errors ?? 0) > 0 || s.isPending)
      .slice(0, MAX_PER_KIND)
    for (const s of hits) {
      const errors = s.errors ?? 0
      push({
        kind: 'SITEMAP_ISSUE',
        severity: errors > 0 ? 'high' : 'low',
        subject: s.path,
        why:
          errors > 0
            ? 'Le sitemap remonte des erreurs : des URLs peuvent ne pas être découvertes/indexées.'
            : 'Sitemap en attente de traitement par Google.',
        evidence: `${errors} erreur(s) · ${num(s.warnings ?? 0)} avertissement(s)${s.isPending ? ' · en attente' : ''}`,
        action:
          errors > 0
            ? 'Corriger les URLs invalides du sitemap puis le re-soumettre dans Search Console.'
            : 'Vérifier la soumission du sitemap et attendre le traitement Google.',
      })
    }
  }

  /* 8 & 9. Dérivés de l'audit technique on-page. */
  if (technical) {
    let metaCount = 0
    let sdCount = 0
    for (const route of technical.routes) {
      if (!route.indexable) continue
      const missingTitle = route.title === 'FAIL'
      const missingDesc = route.description === 'FAIL'
      if ((missingTitle || missingDesc) && metaCount < MAX_PER_KIND) {
        metaCount++
        const parts = [missingTitle ? 'title' : null, missingDesc ? 'meta description' : null]
          .filter(Boolean)
          .join(' + ')
        push({
          kind: 'MISSING_METADATA',
          severity: 'high',
          subject: route.route,
          why: 'Métadonnées incomplètes : Google génère un snippet de secours, moins performant.',
          evidence: `Manquant : ${parts}`,
          action: 'Ajouter un title unique et une meta description incitative à cette route.',
        })
      }
      if (route.structuredData === 'FAIL' && sdCount < MAX_PER_KIND) {
        sdCount++
        push({
          kind: 'MISSING_STRUCTURED_DATA',
          severity: 'low',
          subject: route.route,
          why: 'Données structurées (JSON-LD) absentes : pas d’éligibilité aux résultats enrichis.',
          evidence: 'JSON-LD non détecté sur une route indexable.',
          action: 'Ajouter le balisage schema.org adapté (Organization, Article, Event, FAQ…).',
        })
      }
    }
  }

  // Tri déterministe : sévérité croissante (critical d'abord), puis type, puis sujet.
  out.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (s !== 0) return s
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1
    return a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0
  })

  return out
}

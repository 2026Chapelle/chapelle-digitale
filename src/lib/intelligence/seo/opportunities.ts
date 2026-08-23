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
 *
 * MODÈLE DE PREUVE (5A) — chaque opportunité porte en plus :
 *  - SOURCE : la source réelle qui a DÉTECTÉ le fait (`google_search_console`
 *    ou `technical_audit`). Aucune opportunité « hors-sol ».
 *  - HÔTE + PORTÉE : quand le sujet est (ou dérive d')une URL, l'hôte réel est
 *    classé via `scope.ts`. Un problème sur un hôte institutionnel est étiqueté
 *    `scope:'institutional'`, JAMAIS `'citadelle'` (pas de repli par domaine).
 *    Un sujet « requête » n'a pas d'hôte fiable → host/scope absents (honnête).
 *
 * PROHIBITIONS appliquées ici — une opportunité n'est JAMAIS générée du seul
 * fait qu'une donnée manque, qu'un connecteur est indisponible, que la période
 * n'a renvoyé aucune ligne, qu'une métrique vaut 0 sans dénominateur, ou qu'une
 * URL partage la même racine de domaine. La spéculation n'est jamais présentée
 * comme une preuve.
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
import type { SeoScope } from './scope'
import { classifyUrl, extractHost, SEO_SCOPE_LABEL_FR } from './scope'
import { IMPORTANT_ROUTES, absoluteUrl } from './important-routes'

/* ------------------------------------------------------------------ */
/* Sources réelles (5A — modèle de PREUVE)                             */
/* ------------------------------------------------------------------ */

/**
 * Identifiants de SOURCE réelle ayant DÉTECTÉ le fait. Chaque opportunité en
 * porte une : aucune opportunité n'est « hors-sol ». Valeurs alignées sur le
 * vocabulaire des connecteurs (cf. SeoConnectorStatus.connector).
 */
export const SOURCE_GSC = 'google_search_console'
export const SOURCE_TECHNICAL = 'technical_audit'

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

/**
 * Attache HÔTE + PORTÉE à partir d'une URL réelle (déterministe via `scope.ts`).
 * Renvoie `{}` si l'hôte n'est pas déterminable — JAMAIS d'invention, et JAMAIS
 * un repli « citadelle » par défaut (le module scope classe un hôte inconnu en
 * `external_or_unknown`). Un problème sur un hôte institutionnel reçoit donc
 * `scope:'institutional'`, jamais `'citadelle'`.
 */
function urlScope(u: string | null | undefined): { host?: string; scope?: SeoScope } {
  const host = extractHost(u)
  if (!host) return {}
  return { host, scope: classifyUrl(u) }
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
        // Sujet = requête (pas une URL) : la propriété de domaine ne permet PAS
        // d'attribuer un hôte fiable → host/scope volontairement absents.
        source: SOURCE_GSC,
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
        source: SOURCE_GSC,
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
        source: SOURCE_GSC,
        ...urlScope(p.page),
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
        // PROHIBITION : jamais d'opportunité sans observation. Une requête
        // « nouvelle » ou « montante » à 0 impression n'est pas une preuve —
        // c'est une absence de donnée. On exige un volume observé (> 0).
        (q) =>
          q.impressions > 0 &&
          (q.trend === 'new' ||
            (q.trend === 'up' && typeof q.delta === 'number' && q.delta >= RISING_DELTA)),
      )
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, MAX_PER_KIND)
    for (const q of hits) {
      const isNew = q.trend === 'new'
      push({
        kind: 'RISING_QUERY',
        severity: 'info',
        subject: q.query,
        source: SOURCE_GSC,
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
        source: SOURCE_GSC,
        ...urlScope(r.url),
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
        source: SOURCE_GSC,
        ...urlScope(r.url),
        why: 'Google a choisi une canonique différente de celle déclarée par la page : signaux d’indexation ambigus.',
        evidence: `Déclarée ${r.userCanonical} · retenue par Google ${r.googleCanonical}`,
        action: 'Aligner la balise canonique déclarée sur l’URL cible réelle (ou corriger le contenu dupliqué).',
      })
    }
  }

  /* 7. SITEMAP_ISSUE — sitemap en erreur ou en attente.
   *    PORTÉE : le sitemap est classé par SON hôte réel. Un sitemap
   *    institutionnel (ex. chapelleduroyaume.org/sitemap_index.xml) reçoit
   *    scope:'institutional' — JAMAIS 'citadelle'. La preuve est rattachée à cet
   *    hôte ; aucun impact Citadelle n'est asserté s'il n'est pas démontrable. */
  {
    const hits = sitemaps
      .filter((s) => (s.errors ?? 0) > 0 || s.isPending)
      .slice(0, MAX_PER_KIND)
    for (const s of hits) {
      const errors = s.errors ?? 0
      // Priorité aux champs déjà classés par la normalisation (5A), sinon on
      // classe déterministiquement à partir de l'URL/path du sitemap lui-même.
      const derived = urlScope(s.path)
      const host = s.host ?? derived.host
      const scope = s.scope ?? derived.scope
      const scopeLabel = scope ? SEO_SCOPE_LABEL_FR[scope] : undefined
      push({
        kind: 'SITEMAP_ISSUE',
        severity: errors > 0 ? 'high' : 'low',
        subject: s.path,
        source: SOURCE_GSC,
        ...(host ? { host } : {}),
        ...(scope ? { scope } : {}),
        why:
          errors > 0
            ? `Le sitemap de ${host ?? 'cet hôte'} remonte des erreurs : des URLs de ${scopeLabel ?? 'cet hôte'} peuvent ne pas être découvertes/indexées.`
            : `Sitemap de ${host ?? 'cet hôte'} en attente de traitement par Google.`,
        evidence: `Hôte ${host ?? 'inconnu'}${scopeLabel ? ` · ${scopeLabel}` : ''} · ${errors} erreur(s) · ${num(s.warnings ?? 0)} avertissement(s)${s.isPending ? ' · en attente' : ''}`,
        action:
          errors > 0
            ? `Corriger les URLs invalides du sitemap de ${host ?? 'cet hôte'} puis le re-soumettre dans Search Console.`
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
      // L'audit technique porte sur les routes PUBLIQUES de Citadelle
      // (cf. important-routes / PUBLIC_BASE_URL) : la portée est donc classée à
      // partir de l'URL absolue réelle de la route, pas supposée.
      const routeScope = urlScope(absoluteUrl(route.route))
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
          source: SOURCE_TECHNICAL,
          ...routeScope,
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
          source: SOURCE_TECHNICAL,
          ...routeScope,
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

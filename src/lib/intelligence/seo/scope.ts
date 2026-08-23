/**
 * CITADELLE INTELLIGENCE — 5A · Vérité de PORTÉE (scope) & d'HÔTE (host).
 *
 * La propriété Search Console est une propriété de DOMAINE
 * (sc-domain:chapelleduroyaume.org) qui couvre LÉGITIMEMENT plusieurs hôtes.
 * Une donnée issue de cette propriété N'EST PAS « Citadelle » par défaut : elle
 * doit être classée par HÔTE réel. Ce module est le contrat GELÉ (déterministe,
 * pur, testé) partagé par tous les chantiers 5A.
 *
 * Règle : ne jamais inférer une propriété (« Citadelle ») à partir de la seule
 * origine domaine. Hôte inconnu ⇒ external_or_unknown (jamais inventé).
 */

/** Portée sémantique d'un objet SEO. */
export type SeoScope = 'citadelle' | 'institutional' | 'global' | 'external_or_unknown'

/** Portée par défaut des vues SEO (destination numérique prioritaire). */
export const DEFAULT_SEO_SCOPE: SeoScope = 'citadelle'

/** Hôtes canoniques (source de vérité — cf. rôles d'actifs). */
export const HOST_CITADELLE = 'citadelle.chapelleduroyaume.org'
export const HOST_INSTITUTIONAL = 'chapelleduroyaume.org'
export const HOST_INSTITUTIONAL_WWW = 'www.chapelleduroyaume.org'

/** Libellés FR par portée (UI). */
export const SEO_SCOPE_LABEL_FR: Record<SeoScope, string> = {
  citadelle: 'Citadelle',
  institutional: 'La Chapelle — site institutionnel',
  global: 'Domaine global',
  external_or_unknown: 'Externe / inconnu',
}

/** Description courte FR par portée. */
export const SEO_SCOPE_DESC_FR: Record<SeoScope, string> = {
  citadelle: 'Église digitale — destination numérique prioritaire.',
  institutional: 'Site institutionnel de La Chapelle (hors Citadelle).',
  global: "Tous les hôtes de la propriété de domaine.",
  external_or_unknown: 'Hôte non rattaché de façon fiable à un actif connu.',
}

/**
 * Extrait l'hôte (lowercase, sans port) d'une URL ou d'une chaîne d'hôte.
 * Renvoie null si non déterminable (jamais d'invention).
 */
export function extractHost(input: string | null | undefined): string | null {
  if (!input) return null
  const raw = input.trim()
  if (!raw) return null
  try {
    const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
    const h = new URL(withProto).hostname.toLowerCase()
    return h || null
  } catch {
    // Peut déjà être un hôte nu.
    const h = raw.toLowerCase().replace(/^\/+/, '').split('/')[0]?.split(':')[0]
    return h && h.includes('.') ? h : null
  }
}

/**
 * Classe un HÔTE en portée. Déterministe :
 *  - citadelle.chapelleduroyaume.org (+ sous-domaines *.citadelle.…) → citadelle
 *  - chapelleduroyaume.org / www.chapelleduroyaume.org → institutional
 *  - autre / null → external_or_unknown (jamais « citadelle » par défaut).
 */
export function classifyHost(host: string | null | undefined): SeoScope {
  const h = extractHost(host)
  if (!h) return 'external_or_unknown'
  if (h === HOST_CITADELLE || h.endsWith(`.${HOST_CITADELLE}`)) return 'citadelle'
  if (h === HOST_INSTITUTIONAL || h === HOST_INSTITUTIONAL_WWW) return 'institutional'
  return 'external_or_unknown'
}

/** Classe une URL (ou feedpath sitemap, ou page GSC) en portée via son hôte. */
export function classifyUrl(url: string | null | undefined): SeoScope {
  return classifyHost(extractHost(url))
}

/**
 * Un objet de portée `objectScope` doit-il apparaître sous le filtre `selected` ?
 * - global : tout.
 * - citadelle/institutional : correspondance exacte.
 * - external_or_unknown sélectionné : uniquement les objets externes/inconnus.
 */
export function matchesScope(objectScope: SeoScope, selected: SeoScope): boolean {
  if (selected === 'global') return true
  return objectScope === selected
}

/** Les sélecteurs proposés à l'UI (ordre d'affichage). Défaut = citadelle. */
export const SEO_SCOPE_OPTIONS: ReadonlyArray<SeoScope> = [
  'citadelle',
  'institutional',
  'global',
]

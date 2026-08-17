/**
 * PODCAST — Emplacement de PROMOTION NATIVE éditoriale (bloc cms_homepage_blocks
 * `podcast_promo`). Dérivation PURE (aucune I/O, testable) du `data` du bloc vers un
 * modèle sûr. NON un bandeau publicitaire agressif : une mention discrète (événement /
 * partenaire / campagne de don / formation / livre / contenu interne / campagne sponsorisée).
 *
 * FAIL-SAFE : renvoie `null` s'il n'y a RIEN d'exploitable (ni titre ni image) → la carte
 * est masquée côté UI. Ne LÈVE JAMAIS. Mappe tolérant (snake_case + camelCase). Miroir du
 * style défensif de `parsePodcastHero` (src/lib/podcast/sections.ts).
 */

/** Nature éditoriale de la mention. `decouvrir` = neutre par défaut. */
export type PromotionKind = 'promotion' | 'partenaire' | 'decouvrir'

/** Libellé FR affiché dans la puce de mention, sans jamais dépendre de la seule couleur. */
export const PROMOTION_KIND_LABELS: Record<PromotionKind, string> = {
  promotion: 'Promotion',
  partenaire: 'Partenaire',
  decouvrir: 'À découvrir',
}

const KIND_VALUES: PromotionKind[] = ['promotion', 'partenaire', 'decouvrir']

export interface PodcastPromotion {
  kind: PromotionKind
  eyebrow: string | null
  title: string
  description: string | null
  image: string | null
  ctaLabel: string | null
  ctaHref: string | null
}

/** Trim → string non vide, sinon null. Accepte n'importe quelle valeur inconnue. */
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Premier champ non vide parmi une liste d'alias (snake_case + camelCase). */
const pick = (obj: Record<string, unknown>, keys: string[]): string | null => {
  for (const k of keys) {
    const s = str(obj[k])
    if (s) return s
  }
  return null
}

/**
 * Normalise la nature : accepte `kind`/`type` (snake ou camel déjà couverts par la même clé).
 * Valeur inconnue / absente → 'decouvrir' (défaut neutre). Insensible à la casse et aux espaces.
 */
const normalizeKind = (raw: string | null): PromotionKind => {
  if (!raw) return 'decouvrir'
  const v = raw.trim().toLowerCase()
  return (KIND_VALUES as string[]).includes(v) ? (v as PromotionKind) : 'decouvrir'
}

/**
 * Parse le `data` du bloc `podcast_promo`. Renvoie `null` si aucun contenu exploitable
 * (ni titre ni image) → masquage FAIL-SAFE. Ne lève jamais.
 *
 * Mapping toléré (colonnes natives du bloc CMS + clés jsonb `data`, snake & camel) :
 *  - kind / type                     → PromotionKind (défaut 'decouvrir'). Pas de colonne
 *                                       dédiée → à renseigner dans le jsonb `data` du bloc.
 *  - eyebrow / label / subtitle      → eyebrow   (subtitle = colonne native, cf. parsePodcastHero)
 *  - title                           → title
 *  - description / body              → description (body = colonne native)
 *  - image_url / imageUrl / image    → image
 *  - cta_label / ctaLabel            → ctaLabel
 *  - cta_href / ctaHref              → ctaHref
 */
export function parsePodcastPromotion(blockData: unknown): PodcastPromotion | null {
  if (!blockData || typeof blockData !== 'object' || Array.isArray(blockData)) return null
  const d = blockData as Record<string, unknown>

  const title = pick(d, ['title'])
  const image = pick(d, ['image_url', 'imageUrl', 'image'])
  // FAIL-SAFE : rien à montrer sans au moins un titre ou une image.
  if (!title && !image) return null

  return {
    kind: normalizeKind(pick(d, ['kind', 'type'])),
    eyebrow: pick(d, ['eyebrow', 'label', 'subtitle']),
    title: title ?? '',
    description: pick(d, ['description', 'body']),
    image,
    ctaLabel: pick(d, ['cta_label', 'ctaLabel']),
    ctaHref: pick(d, ['cta_href', 'ctaHref']),
  }
}

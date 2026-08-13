/**
 * PODCAST-5C — Offre Premium (côté membre). Détermine s'il existe une DESTINATION
 * d'achat RÉELLE (produit marketplace mappé à 'podcast_premium', actif, avec lien_achat).
 * Sans offre réelle → aucun CTA n'est affiché (message neutre) : jamais de faux bouton.
 *
 * Logique PURE (testable) ; la lecture RLS de marketplace_products se fait côté page.
 */

export interface PremiumOffer {
  /** URL de checkout canonique (http/https validée). */
  url: string
  titre: string | null
}

/**
 * Normalise une ligne marketplace_products en offre Premium exploitable, ou null.
 * Exige une URL http(s) absolue — un lien vide/relatif/invalide ⇒ pas d'offre (CTA neutre).
 */
export function normalizePremiumOffer(
  row: { lien_achat?: string | null; titre?: string | null } | null | undefined,
): PremiumOffer | null {
  const raw = typeof row?.lien_achat === 'string' ? row.lien_achat.trim() : ''
  if (!/^https?:\/\/\S+/i.test(raw)) return null
  return { url: raw, titre: typeof row?.titre === 'string' && row.titre.trim() ? row.titre.trim() : null }
}

export interface PremiumNotice {
  title: string
  message: string
  /** Présent UNIQUEMENT si une offre d'achat réelle existe. */
  ctaUrl?: string
  ctaLabel?: string
}

/**
 * Message affiché sur un refus « premium ». Avec offre réelle → invitation + CTA vers
 * la destination d'achat ; sans offre → message neutre (aucun CTA), conforme à l'acquis
 * PODCAST-5B (pas de fausse destination).
 */
export function premiumDeniedNotice(offer: PremiumOffer | null | undefined): PremiumNotice {
  if (offer) {
    return {
      title: 'Contenu premium',
      message: 'Cet épisode fait partie de l’offre Premium de La Voix du Royaume. Débloquez l’accès pour l’écouter.',
      ctaUrl: offer.url,
      ctaLabel: 'Découvrir le Premium',
    }
  }
  return {
    title: 'Contenu premium',
    message: "Cet épisode premium n'est pas encore accessible à ton compte.",
  }
}

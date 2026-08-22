/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Attribution par source PURE pour l'onglet Conversions. On RÉUTILISE le service
 * canonique HUB-2 (buildAcquisition, detectSource first-party) : Source × Visites
 * × Inscriptions × Progressions. La colonne « Conversion » (taux par source) est
 * marquée UNAVAILABLE : le numérateur (conversion first-touch) peut pointer une
 * session ANTÉRIEURE à la fenêtre des visites ⇒ cohortes différentes, taux non
 * fiable (rate > 100 % possible). On n'affiche donc jamais un taux fabriqué.
 */

import type { AcquisitionResult } from '../metrics/acquisition'
import type { SourceAttributionResult, SourceAttributionRow } from './types'

/** Libellés FR des sources normalisées (aligné sur le cockpit). */
export const SOURCE_LABEL_FR: Record<string, string> = {
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  google: 'Google / recherche',
  tiktok: 'TikTok',
  twitter: 'X / Twitter',
  telegram: 'Telegram',
  email: 'E-mail',
  chapelle: 'Chapelle',
  referral: 'Autre site (referral)',
  direct: 'Direct',
  unknown: 'Inconnu',
  other: 'Autre',
}

export function labelSource(source: string): string {
  return SOURCE_LABEL_FR[source] ?? source
}

const PER_SOURCE_RATE_REASON =
  "Taux par source non fiable : une conversion est rattachée à sa session first-touch, qui peut être antérieure à la fenêtre des visites du jour. Numérateur et dénominateur relèveraient de cohortes différentes (taux > 100 % possible).";

/**
 * Transforme un AcquisitionResult (HUB-2) en table d'attribution HUB-4. PURE.
 * - Visites / Inscriptions / Progressions = comptes RÉELS repris tels quels.
 * - Colonne Conversion = UNAVAILABLE (raison explicite), jamais un taux inventé.
 * - Mode démo propagé honnêtement (aucune ligne fabriquée).
 */
export function buildSourceAttribution(acq: AcquisitionResult | null): SourceAttributionResult {
  if (!acq || acq.demoMode) {
    return {
      availability: 'DEMO',
      rows: [],
      unattributed: { signups: 0, progressions: 0 },
      internalVisitsExcluded: 0,
      reason: "Mode démonstration : aucune donnée d'attribution réelle.",
    }
  }

  const rows: SourceAttributionRow[] = acq.rows.map((r) => ({
    source: r.source,
    label: labelSource(r.source),
    visits: r.visits,
    signups: r.signups,
    // « Progressions » = complétions de module rattachées à la source (HUB-2).
    progressions: r.parcoursCompletions,
    conversionRate: null,
    conversionAvailability: 'UNAVAILABLE',
    conversionReason: PER_SOURCE_RATE_REASON,
  }))

  return {
    // La lecture a abouti : disponibilité RÉELLE. Un tableau vide (0 visite attribuée)
    // reste REAL — « 0 réel » n'est PAS « indisponible ».
    availability: 'REAL',
    rows,
    unattributed: {
      signups: acq.unattributed.signups,
      progressions: acq.unattributed.parcoursCompletions,
    },
    internalVisitsExcluded: acq.internalVisitsExcluded,
  }
}

/**
 * CITADELLE INTELLIGENCE — 5B · QUALITÉ DE MESURE (contexte véridique).
 *
 * `buildDataQuality` est PUR : il assemble, à partir de FAITS réels déjà lus
 * (connecteurs configurés, étapes de funnel instrumentées ou non, attribution
 * partielle), trois listes honnêtes — FIABLE / PARTIEL / À INSTRUMENTER — plus
 * des COMPTES de couverture issus du contrat d'événements.
 *
 * RÈGLE CARDINALE : AUCUN pourcentage synthétique, AUCUN score A/B/C. On expose
 * uniquement des faits et des comptes bruts (available/partial/gap/total).
 */

import type {
  DataQualityContext,
  DataQualityItem,
  DecisionChannelsPayload,
  DecisionFunnelPayload,
} from './contract'
import { coverageSummary } from '../core/event-contract'

/** Entrées (déjà lues côté agrégateur) pour construire le contexte qualité. */
export interface DataQualityBuildInput {
  /** Horloge injectée (ISO 8601). */
  nowIso: string
  /** Search Console réellement connecté (lecture seule) ? */
  gscConfigured?: boolean
  /** GA4 réellement connecté (lecture seule) ? */
  ga4Configured?: boolean
  /** Connecteur YouTube réellement connecté ? */
  youtubeConnected?: boolean
  /** Funnel réel : sert à détecter les étapes UNAVAILABLE (à instrumenter). */
  funnel?: DecisionFunnelPayload | null
  /** Canaux réels : servent à révéler l'attribution partielle. */
  channels?: DecisionChannelsPayload | null
  /** Search Console encore trop peu de données pour conclure. */
  seoInsufficient?: boolean
}

/**
 * Construit le contexte de qualité de mesure. Déterministe, sans I/O.
 * Les listes ne contiennent QUE des faits réellement établis par les entrées.
 */
export function buildDataQuality(input: DataQualityBuildInput): DataQualityContext {
  const reliable: DataQualityItem[] = []
  const partial: DataQualityItem[] = []
  const toInstrument: DataQualityItem[] = []

  /* ── FIABLE : sources réelles connectées ─────────────────────────────── */
  // Première partie : toujours captée par la Citadelle (mesure directe).
  reliable.push({
    label: 'Visites Citadelle',
    detail: 'analytics_events (pageview) — mesure première partie',
  })
  reliable.push({
    label: 'Inscriptions',
    detail: 'profiles.created_at — mesure première partie',
  })
  if (input.gscConfigured) {
    reliable.push({
      label: 'Search Console',
      detail: 'Google Search Console connecté (lecture seule)',
    })
  }
  if (input.ga4Configured) {
    reliable.push({
      label: 'Analytics GA4',
      detail: 'Google Analytics 4 connecté (lecture seule)',
    })
  }
  if (input.youtubeConnected) {
    reliable.push({
      label: 'YouTube',
      detail: 'API YouTube connectée (lecture seule)',
    })
  }

  /* ── PARTIEL : mesurable mais incomplet ──────────────────────────────── */
  const unattributed = input.channels?.unattributed
  if (unattributed && (unattributed.signups > 0 || unattributed.progressions > 0)) {
    partial.push({
      label: 'Attribution des sources',
      detail:
        `Inscriptions/progressions non rattachées à une source ` +
        `(${unattributed.signups}/${unattributed.progressions})`,
    })
  } else if (input.channels) {
    partial.push({
      label: 'Attribution des sources',
      detail: 'Attribution première partie incomplète par nature (referrer manquant)',
    })
  }
  if (input.gscConfigured || input.seoInsufficient) {
    partial.push({
      label: 'SEO différé',
      detail: 'Search Console synchronisé avec délai (J-2/J-3), jamais temps réel',
    })
  }

  /* ── À INSTRUMENTER : lacunes réelles ────────────────────────────────── */
  if (input.funnel) {
    for (const stage of input.funnel.stages) {
      if (stage.status === 'UNAVAILABLE') {
        toInstrument.push({
          label: stage.label,
          detail: stage.reason ?? 'Étape non instrumentée',
        })
      }
    }
  } else {
    // Sans funnel fourni : lacunes canoniques connues (défaut honnête).
    toInstrument.push({
      label: 'Activation',
      detail: "Signal d'activation non instrumenté",
    })
    toInstrument.push({
      label: 'Conversion composite',
      detail: 'Fin de parcours / conversion composite non instrumentée',
    })
  }

  /* ── COUVERTURE : comptes bruts (aucun %, aucun score) ───────────────── */
  const cov = coverageSummary()
  const coverage = {
    available: cov.available,
    partial: cov.partial,
    gap: cov.gap,
    total: cov.total,
  }

  return {
    generatedAt: input.nowIso,
    reliable,
    partial,
    toInstrument,
    coverage,
  }
}

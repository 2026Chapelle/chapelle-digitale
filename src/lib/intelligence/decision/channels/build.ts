/**
 * CITADELLE INTELLIGENCE — 5B · AGENT 3 · VALEUR PAR CANAL (PUR).
 *
 * « Quels canaux produisent une VALEUR Citadelle mesurable ? »
 *
 * Honnêteté cardinale (Evidence First) :
 *  - Les colonnes CITADELLE proviennent EXCLUSIVEMENT de l'attribution first-party
 *    réelle (AcquisitionResult.rows). Aucune ne peut être remplie par une métrique
 *    de PLATEFORME (vues / abonnés / audience). Cf. garde PLATFORM_VS_CITADELLE.
 *  - Le contexte de PLATEFORME (YouTube, WhatsApp, Meta) vit dans une structure
 *    SÉPARÉE (`platformContext`) et n'est JAMAIS fusionné dans un score composite.
 *  - Le « taux visite → inscription » par source est marqué UNAVAILABLE : la
 *    conversion est rattachée à sa session first-touch, potentiellement antérieure
 *    à la fenêtre des visites → cohortes différentes (taux > 100 % possible). On ne
 *    fabrique JAMAIS un taux (cf. `PER_SOURCE_RATE_REASON` du service HUB-4 5A).
 *  - Meta n'est jamais masqué : il apparaît en état honnête INDISPONIBLE, sans
 *    aucun appel d'API (ce builder est PUR, aucune I/O).
 *  - `unattributed` reste `unattributed` (jamais réattribué) ; un 0 réel reste REAL.
 *
 * PUR : aucune I/O, horloge injectée (`nowIso`). Le mode démo se propage honnêtement.
 */

import type {
  DecisionChannelsPayload,
  ChannelCitadelleValue,
  ChannelPlatformContext,
  MeasuredValue,
  MeasuredRate,
  DecisionPeriod,
  DecisionAvailability,
} from '../contract'
import type { AcquisitionResult } from '../../metrics/acquisition'
import { labelSource } from '../../conversions/source-attribution'
import type { YouTubeData } from '../../connectors/youtube/types'
import type { WhatsAppAttributionResult } from '../../connectors/whatsapp/attribution'
import { isLiveState } from '../../channels/types'
import { confidenceFromSample } from '../thresholds'
import { buildChannelRankings } from './rankings'

/* ── Raisons documentées (réutilisées mot pour mot depuis 5A / HUB-4) ─────── */

/**
 * RAISON GELÉE 5A (source : `conversions/source-attribution.ts`,
 * const `PER_SOURCE_RATE_REASON`). Reproduite ici car non exportée à la source ;
 * la formulation doit rester ALIGNÉE avec le cockpit HUB-4.
 */
export const PER_SOURCE_RATE_REASON =
  "Taux par source non fiable : une conversion est rattachée à sa session first-touch, qui peut être antérieure à la fenêtre des visites du jour. Numérateur et dénominateur relèveraient de cohortes différentes (taux > 100 % possible)."

/**
 * Il n'existe aucun compteur first-party UNIQUE de « conversions » par source :
 * les paliers réels attribuables sont visites / inscriptions / écoutes /
 * progressions. Agréger une « conversion » unique par canal serait fabriqué.
 */
export const PER_SOURCE_CONVERSIONS_REASON =
  "Aucun compteur first-party unique de « conversion » par source : les paliers réels sont visites, inscriptions, écoutes et progressions. Un total de conversion par canal serait fabriqué."

/* ── Entrée du builder (déjà lue par l'agrégateur superviseur) ────────────── */

/** État Meta honnête (injecté, jamais lu ici — aucun appel Meta). */
export interface MetaChannelInput {
  /** État normalisé du canal (ex. 'UNAVAILABLE', 'AUTH_REQUIRED', 'NOT_CONFIGURED'). */
  state: string
  /** Libellé FR (ex. « Facebook », « Instagram »). */
  label: string
  /** Raison non sensible de l'indisponibilité. */
  reason?: string
}

export interface ChannelsBuildInput {
  /** Attribution first-party canonique (HUB-2). null ⇒ démo. */
  acquisition: AcquisitionResult | null
  /** Contexte plateforme YouTube (connecteur read-only). */
  youtube?: YouTubeData | null
  /** Attribution WhatsApp first-party (présence de canal). */
  whatsapp?: WhatsAppAttributionResult | null
  /** État Meta Facebook honnête (jamais d'appel API). */
  metaFacebook?: MetaChannelInput | null
  /** État Meta Instagram honnête (jamais d'appel API). */
  metaInstagram?: MetaChannelInput | null
  period: DecisionPeriod
  nowIso: string
  demo?: boolean
}

/* ── Fabriques de valeurs honnêtes ────────────────────────────────────────── */

/** Valeur RÉELLE (0 réel inclus). */
const real = (value: number): MeasuredValue => ({ value, availability: 'REAL' })

/** Valeur non mesurable : jamais un faux 0. */
const missing = (availability: DecisionAvailability, reason: string): MeasuredValue => ({
  value: null,
  availability,
  reason,
})

/* ── Colonnes CITADELLE (attribution réelle uniquement) ───────────────────── */

/**
 * Construit une ligne CITADELLE à partir d'une ligne d'acquisition RÉELLE.
 * Toutes les valeurs proviennent de l'attribution first-party — jamais de la
 * plateforme. Le 0 réel est préservé (REAL, value=0).
 */
function citadelleRowFromAcquisition(row: AcquisitionResult['rows'][number]): ChannelCitadelleValue {
  const visitToSignupRate: MeasuredRate = {
    rate: null,
    availability: 'UNAVAILABLE',
    reason: PER_SOURCE_RATE_REASON,
    // Dénominateur connu (visites) exposé pour les gardes, même si le taux est indisponible.
    sampleSize: row.visits,
  }

  return {
    source: row.source,
    label: labelSource(row.source),
    citadelleVisits: real(row.visits), // RÉEL (session native first-touch)
    attributedSignups: real(row.signups), // RÉEL (inscriptions rattachées)
    visitToSignupRate, // UNAVAILABLE — cohortes non comparables (jamais fabriqué)
    engagement: real(row.podcastStarts), // RÉEL (écoutes / play_start rattachés)
    parcours: real(row.parcoursCompletions), // RÉEL (progressions rattachées)
    // Pas de compteur unique de « conversion » par source ⇒ UNAVAILABLE honnête.
    conversions: missing('UNAVAILABLE', PER_SOURCE_CONVERSIONS_REASON),
    confidence: confidenceFromSample(row.visits),
  }
}

/* ── Contexte PLATEFORME (structurellement séparé de l'impact Citadelle) ──── */

/**
 * YouTube : portée de plateforme (vues, temps de visionnage, variation d'abonnés).
 * REAL uniquement si la chaîne est vivante ET des totaux existent sur la période.
 */
function youtubePlatformContext(yt: YouTubeData | null | undefined): ChannelPlatformContext {
  const label = 'YouTube'
  if (!yt) {
    return {
      channel: 'youtube',
      label,
      availability: 'UNAVAILABLE',
      metrics: [],
      reason: 'Connecteur YouTube non fourni.',
    }
  }

  const live = isLiveState(yt.status.state)
  const totals = yt.totals

  let availability: DecisionAvailability
  let reason: string | undefined
  if (live && totals) {
    availability = 'REAL'
  } else if (live && !totals) {
    availability = 'NO_DATA'
    reason = 'Chaîne connectée : aucune donnée analytics sur la période.'
  } else {
    availability = 'UNAVAILABLE'
    reason = yt.status.reason ?? 'YouTube non connecté.'
  }

  // Une métrique de PLATEFORME n'est REAL que si la fenêtre porte des totaux réels.
  const platformMetric = (n: number | null): MeasuredValue =>
    availability === 'REAL' && n !== null ? real(n) : missing(availability, reason ?? 'Indisponible.')

  const subscribersNet = totals ? totals.subscribersGained - totals.subscribersLost : null

  const metrics = [
    { key: 'views', label: 'Vues', value: platformMetric(totals?.views ?? null), unit: 'vues' },
    {
      key: 'watchTimeMinutes',
      label: 'Temps de visionnage',
      value: platformMetric(totals?.watchTimeMinutes ?? null),
      unit: 'min',
    },
    {
      key: 'subscribersNet',
      label: "Variation d'abonnés",
      value: platformMetric(subscribersNet),
      unit: 'abonnés',
    },
  ]

  return { channel: 'youtube', label, availability, metrics, ...(reason ? { reason } : {}) }
}

/**
 * WhatsApp : il n'existe AUCUNE métrique d'audience de plateforme exploitable
 * (pas d'API d'audience). L'impact Citadelle réel figure déjà dans les colonnes
 * CITADELLE (source 'whatsapp'). On représente donc la PRÉSENCE du canal
 * honnêtement, sans jamais promouvoir une visite Citadelle en métrique de portée.
 */
function whatsappPlatformContext(wa: WhatsAppAttributionResult | null | undefined): ChannelPlatformContext {
  const label = 'WhatsApp'
  return {
    channel: 'whatsapp',
    label,
    // NOT_APPLICABLE : aucune portée de plateforme mesurable côté WhatsApp.
    availability: 'NOT_APPLICABLE',
    metrics: [],
    reason: wa
      ? "Aucune métrique d'audience de plateforme WhatsApp. L'impact Citadelle attribué figure dans les colonnes Citadelle (source « WhatsApp »)."
      : "Canal WhatsApp non fourni. Aucune métrique d'audience de plateforme n'existe côté WhatsApp.",
  }
}

/**
 * Meta (Facebook / Instagram) : TOUJOURS affiché, jamais masqué, en état honnête
 * INDISPONIBLE. Aucun appel d'API n'est effectué (builder PUR).
 */
function metaPlatformContext(
  channel: 'meta_facebook' | 'meta_instagram',
  defaultLabel: string,
  input: MetaChannelInput | null | undefined,
): ChannelPlatformContext {
  const reason =
    input?.reason ??
    "Connexion Meta en attente : propriété gérée côté propriétaire externe (aucun accès API)."
  return {
    channel,
    label: input?.label ?? defaultLabel,
    availability: 'UNAVAILABLE',
    metrics: [],
    reason,
  }
}

/* ── Builder principal ────────────────────────────────────────────────────── */

/**
 * `buildChannelValue` — PUR. Transforme les entrées déjà lues en une surface de
 * comparaison de valeur par canal VÉRIDIQUE (colonnes Citadelle + contexte
 * plateforme séparé + classements nommés gardés par la comparabilité).
 */
export function buildChannelValue(input: ChannelsBuildInput): DecisionChannelsPayload {
  const acq = input.acquisition
  const demoMode = input.demo === true || acq === null || acq.demoMode === true

  // Colonnes Citadelle + agrégats de partiel — uniquement sur données RÉELLES.
  const citadelle: ChannelCitadelleValue[] = demoMode || !acq ? [] : acq.rows.map(citadelleRowFromAcquisition)

  const unattributed =
    demoMode || !acq
      ? { signups: 0, progressions: 0 }
      : {
          // Préservé VERBATIM : jamais réattribué à un canal.
          signups: acq.unattributed.signups,
          progressions: acq.unattributed.parcoursCompletions,
        }

  const internalVisitsExcluded = demoMode || !acq ? 0 : acq.internalVisitsExcluded

  // Contexte plateforme : ordre déterministe, Meta toujours présent.
  const platformContext: ChannelPlatformContext[] = [
    youtubePlatformContext(input.youtube),
    whatsappPlatformContext(input.whatsapp),
    metaPlatformContext('meta_facebook', 'Facebook', input.metaFacebook),
    metaPlatformContext('meta_instagram', 'Instagram', input.metaInstagram),
  ]

  const rankings = buildChannelRankings(citadelle, input.period)

  return {
    generatedAt: input.nowIso,
    scope: 'citadelle',
    period: input.period,
    demoMode,
    citadelle,
    unattributed,
    internalVisitsExcluded,
    platformContext,
    rankings,
  }
}

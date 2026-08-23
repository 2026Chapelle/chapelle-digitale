/**
 * CITADELLE INTELLIGENCE — 5B · RÈGLES DE SIGNAUX DÉTERMINISTES.
 *
 * « À comprendre aujourd'hui » n'est PAS un générateur LLM : chaque signal
 * provient d'une RÈGLE explicite et pure. Une règle ne produit un signal QUE
 * si sa PREUVE existe réellement (Evidence First). Chaque signal porte
 * obligatoirement EVIDENCE + SOURCE + PERIOD + SCOPE.
 *
 * Interdits de langage (sauf si la preuve établit EXACTEMENT la conclusion) :
 *   « Les gens préfèrent… », « Ton audience veut… », « Cette stratégie
 *   fonctionne… », « Il faut absolument… ».
 * Préférés :
 *   « Les données observées montrent… », « Sur la période sélectionnée… »,
 *   « Parmi les sources attribuées… », « Échantillon encore insuffisant… ».
 */

import type {
  ConfidenceState,
  DecisionFunnelPayload,
  DecisionFunnelRate,
  DecisionFunnelStage,
  DecisionFunnelStageKey,
  DecisionChannelsPayload,
  DataQualityContext,
  DecisionPeriod,
  DecisionScope,
  DecisionSignal,
  MeasuredRate,
  MeasuredValue,
  SignalEvidenceItem,
} from '../contract'
import type { YouTubeTrends } from '../../connectors/youtube/types'
import {
  confidenceFromSample,
  isConfidentEnough,
  MIN_ABSOLUTE_VOLUME_FOR_TREND,
  MIN_COMPARABLE_CHANNELS_FOR_RANKING,
  MIN_MATERIAL_DELTA_RATIO,
} from '../thresholds'

/* ══════════════════════════════════════════════════════════════════════════
 * Entrée commune des règles
 * ════════════════════════════════════════════════════════════════════════ */

/** Faits de contenu FACTUELS (jamais un sujet éditorial recommandé → hors 5B). */
export interface DecisionContentFacts {
  mostViewedYouTube?: { title: string; views: number; source: string } | null
  mostListenedPodcast?: { title: string; plays: number; source: string } | null
}

/** Statut public d'un connecteur (sans secret) reçu de l'agrégateur. */
export interface ConnectorStatusInput {
  channel: string
  label: string
  state: string
  setupRequired?: boolean
}

/** Entrées PURES de `evaluateSignals` (déjà lues, horloge injectée). */
export interface SignalsBuildInput {
  funnel: DecisionFunnelPayload
  channels: DecisionChannelsPayload
  dataQuality: DataQualityContext
  period: DecisionPeriod
  scope: DecisionScope
  /**
   * Période RÉELLE des données de PLATEFORME (ex. « 28 derniers jours »), distincte
   * de `period` (« aujourd'hui »). Portée par les signaux dérivés de la plateforme
   * (tendance YouTube, contenu YouTube) pour ne jamais étiqueter du 28 j « aujourd'hui ».
   * À défaut, on retombe honnêtement sur `period`.
   */
  platformPeriod?: DecisionPeriod
  /** Tendance native du connecteur — SEULE source autorisée de GROWTH/DECLINE. */
  youtubeTrends?: YouTubeTrends | null
  /** Search Console encore trop peu de données pour conclure. */
  seoInsufficient?: boolean
  /** Statuts publics des connecteurs (Meta bloqué, auth requise…). */
  connectorStatuses?: ConnectorStatusInput[]
  /** Faits de contenu factuels (optionnel). */
  content?: DecisionContentFacts | null
  nowIso: string
  demo?: boolean
}

/* ══════════════════════════════════════════════════════════════════════════
 * Helpers PURS (formatage FR, preuves)
 * ════════════════════════════════════════════════════════════════════════ */

const nf = new Intl.NumberFormat('fr-FR')
/** Nombre formaté FR (séparateurs de milliers). */
function num(n: number): string {
  return nf.format(n)
}
/** Ratio 0..1 → « 20 % ». Un taux réel strictement positif ne s'arrondit jamais
 *  à « 0 % » (on montre « <1 % » pour rester honnête sous 0,5 %). */
function pct(rate: number): string {
  const rounded = Math.round(rate * 100)
  if (rate > 0 && rounded === 0) return '<1 %'
  return `${rounded} %`
}
/** Delta signé 0..1 → « +18 % » / « -22 % ». */
function signedPct(delta: number): string {
  const p = Math.round(delta * 100)
  return `${p > 0 ? '+' : ''}${p} %`
}

/** Preuve valeur (nombre réel). */
function evValue(metric: string, value: number, source: string): SignalEvidenceItem {
  const measured: MeasuredValue = { value, availability: 'REAL' }
  return { metric, measured, source }
}
/** Preuve « valeur absente » (traçable jusqu'à la lacune). */
function evMissing(
  metric: string,
  availability: MeasuredValue['availability'],
  reason: string,
  source: string,
): SignalEvidenceItem {
  const measured: MeasuredValue = { value: null, availability, reason }
  return { metric, measured, source }
}
/** Preuve taux (avec taille d'échantillon quand connue). */
function evRate(
  metric: string,
  rate: number,
  sampleSize: number | null | undefined,
  source: string,
): SignalEvidenceItem {
  const measured: MeasuredRate = { rate, availability: 'REAL', sampleSize: sampleSize ?? null }
  return { metric, measured, source }
}

/** Accès à une étape par clé. */
function stageByKey(
  funnel: DecisionFunnelPayload,
  key: DecisionFunnelStageKey,
): DecisionFunnelStage | undefined {
  return funnel.stages.find((s) => s.key === key)
}
/** Accès à un taux consécutif from→to. */
function rateBetween(
  funnel: DecisionFunnelPayload,
  fromKey: DecisionFunnelStageKey,
  toKey: DecisionFunnelStageKey,
): DecisionFunnelRate | undefined {
  return funnel.rates.find((r) => r.fromKey === fromKey && r.toKey === toKey)
}

/* ══════════════════════════════════════════════════════════════════════════
 * IDENTIFIANTS de règles (stables) — pour tri, dédup et référence UI
 * ════════════════════════════════════════════════════════════════════════ */

export const SIGNAL_IDS = {
  dropOff: 'funnel-drop-off',
  funnelUnmeasurable: 'funnel-unmeasurable',
  conversion: 'funnel-conversion-rate',
  channelRate: 'channel-rate-opportunity',
  channelTraffic: 'channel-top-traffic',
  youtubeGrowth: 'youtube-audience-growth',
  youtubeDecline: 'youtube-audience-decline',
  seoInsufficient: 'seo-insufficient',
  instrumentationGaps: 'instrumentation-gaps',
  connectorStatus: 'connector-status',
  content: 'content-top',
} as const

/* ══════════════════════════════════════════════════════════════════════════
 * RÈGLE 1 — DROP_OFF (point de fuite réel) OU DATA_QUALITY (non mesurable)
 * Source : funnel (primaryDropOffKey + taux REAL de la transition entrante).
 * Déclenche DROP_OFF si le taux entrant est REAL. Si le point de fuite ne peut
 * être affirmé car une étape est UNAVAILABLE, produit un signal DATA_QUALITY —
 * jamais un drop-off fabriqué.
 * ════════════════════════════════════════════════════════════════════════ */

export function ruleDropOff(input: SignalsBuildInput): DecisionSignal | null {
  const { funnel } = input
  const dropKey = funnel.primaryDropOffKey

  if (dropKey) {
    // Transition ENTRANTE vers l'étape de fuite : stages[i-1] → dropKey.
    const idx = funnel.stages.findIndex((s) => s.key === dropKey)
    const prev = idx > 0 ? funnel.stages[idx - 1] : undefined
    const toStage = idx >= 0 ? funnel.stages[idx] : undefined
    if (prev && toStage) {
      const rate = rateBetween(funnel, prev.key, toStage.key)
      if (rate && rate.availability === 'REAL' && rate.rate !== null && prev.value !== null) {
        const passRate = rate.rate
        const lossRate = Math.max(0, 1 - passRate)
        const confidence = confidenceFromSample(prev.value)
        const evidence: SignalEvidenceItem[] = [
          evValue(prev.label, prev.value, prev.source),
          evRate(
            `Passage ${prev.label} → ${toStage.label}`,
            passRate,
            prev.value,
            `${prev.source} → ${toStage.source}`,
          ),
        ]
        if (toStage.value !== null) {
          evidence.push(evValue(toStage.label, toStage.value, toStage.source))
        }
        return {
          id: SIGNAL_IDS.dropOff,
          category: 'DROP_OFF',
          title: `Déperdition ${prev.label} → ${toStage.label}`,
          fact:
            `Sur la période sélectionnée, ${pct(lossRate)} des « ${prev.label} » ` +
            `n'atteignent pas « ${toStage.label} » (taux de passage ${pct(passRate)}).`,
          whyItMatters:
            'Cette transition présente la plus forte déperdition mesurable du tunnel Citadelle.',
          source: `${prev.source} → ${toStage.source}`,
          period: input.period,
          scope: input.scope,
          evidence,
          confidence,
          action: isConfidentEnough(confidence)
            ? `Examiner la transition « ${prev.label} → ${toStage.label} » pour réduire cette déperdition.`
            : null,
        }
      }
    }
  }

  // Aucun point de fuite affirmable + une étape non instrumentée ⇒ DATA_QUALITY.
  const unavailable = funnel.stages.filter((s) => s.status === 'UNAVAILABLE')
  if (dropKey === null && unavailable.length > 0) {
    const evidence: SignalEvidenceItem[] = unavailable.map((s) =>
      evMissing(s.label, 'UNAVAILABLE', s.reason ?? 'Étape non instrumentée', s.source),
    )
    return {
      id: SIGNAL_IDS.funnelUnmeasurable,
      category: 'DATA_QUALITY',
      title: 'Point de fuite non mesurable',
      fact:
        'La transition clé du tunnel ne peut pas être mesurée : une étape ' +
        `(${unavailable.map((s) => `« ${s.label} »`).join(', ')}) n'est pas encore instrumentée.`,
      whyItMatters:
        'Aucun point de fuite ne peut être affirmé tant que cette étape reste non mesurée.',
      source: unavailable.map((s) => s.source).join(', '),
      period: input.period,
      scope: input.scope,
      evidence,
      confidence: 'INSUFFICIENT_DATA',
      action: null,
    }
  }

  return null
}

/* ══════════════════════════════════════════════════════════════════════════
 * RÈGLE 2 — CONVERSION (taux d'acquisition réel visite → inscription)
 * Source : funnel (CITADELLE_VISIT → SIGNUP), taux REAL uniquement.
 * ════════════════════════════════════════════════════════════════════════ */

export function ruleConversion(input: SignalsBuildInput): DecisionSignal | null {
  const { funnel } = input
  const visit = stageByKey(funnel, 'CITADELLE_VISIT')
  const signup = stageByKey(funnel, 'SIGNUP')
  const rate = rateBetween(funnel, 'CITADELLE_VISIT', 'SIGNUP')
  if (
    !visit ||
    !signup ||
    !rate ||
    rate.availability !== 'REAL' ||
    rate.rate === null ||
    visit.value === null
  ) {
    return null
  }

  const confidence = confidenceFromSample(visit.value)
  const evidence: SignalEvidenceItem[] = [
    evValue(visit.label, visit.value, visit.source),
    evRate('Taux visite → inscription', rate.rate, visit.value, `${visit.source} → ${signup.source}`),
  ]
  if (signup.value !== null) {
    evidence.push(evValue(signup.label, signup.value, signup.source))
  }

  const signupsText = signup.value !== null ? `${num(signup.value)} inscriptions` : 'des inscriptions'
  return {
    id: SIGNAL_IDS.conversion,
    category: 'CONVERSION',
    title: 'Taux visite → inscription',
    fact:
      `Sur la période sélectionnée, ${num(visit.value)} visites Citadelle ont produit ` +
      `${signupsText} (taux ${pct(rate.rate)}).`,
    whyItMatters:
      "Ce taux mesure l'efficacité d'acquisition directe sur le périmètre Citadelle.",
    source: `${visit.source} → ${signup.source}`,
    period: input.period,
    scope: input.scope,
    evidence,
    confidence,
    action: isConfidentEnough(confidence)
      ? "Analyser le parcours d'inscription pour améliorer ce taux."
      : null,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * RÈGLE 3 — CHANNEL_OPPORTUNITY
 * a) taux réel comparable (garde d'échantillon) : « moins de trafic mais
 *    meilleur taux d'inscription que les sources comparables » ;
 * b) repli FACTUEL : source la plus attribuée en trafic (classement disponible).
 * Jamais de classement sur données non comparables.
 * ════════════════════════════════════════════════════════════════════════ */

export function ruleChannelOpportunity(input: SignalsBuildInput): DecisionSignal | null {
  const { channels } = input

  /* a) Opportunité fondée sur un TAUX réel comparable ------------------- */
  const comparable = channels.citadelle.filter(
    (c) =>
      c.visitToSignupRate.availability === 'REAL' &&
      c.visitToSignupRate.rate !== null &&
      typeof c.visitToSignupRate.sampleSize === 'number' &&
      c.citadelleVisits.availability === 'REAL' &&
      c.citadelleVisits.value !== null,
  )
  if (comparable.length >= MIN_COMPARABLE_CHANNELS_FOR_RANKING) {
    const sorted = [...comparable].sort(
      (a, b) => (b.visitToSignupRate.rate as number) - (a.visitToSignupRate.rate as number),
    )
    const top = sorted[0]
    // Existe-t-il une source à PLUS gros trafic mais taux inférieur ?
    const bigger = sorted
      .slice(1)
      .find((c) => (c.citadelleVisits.value as number) > (top.citadelleVisits.value as number))
    if (bigger) {
      const sample = top.visitToSignupRate.sampleSize as number
      const confidence = confidenceFromSample(sample)
      const topRate = top.visitToSignupRate.rate as number
      const evidence: SignalEvidenceItem[] = [
        evRate(`Taux d'inscription — ${top.label}`, topRate, sample, `analytics_sessions:${top.source}`),
        evValue(`Trafic Citadelle — ${top.label}`, top.citadelleVisits.value as number, `analytics_sessions:${top.source}`),
        evValue(`Trafic Citadelle — ${bigger.label}`, bigger.citadelleVisits.value as number, `analytics_sessions:${bigger.source}`),
      ]
      return {
        id: SIGNAL_IDS.channelRate,
        category: 'CHANNEL_OPPORTUNITY',
        title: `${top.label} : meilleur taux d'inscription`,
        fact:
          `Parmi les sources comparables, « ${top.label} » affiche le meilleur taux ` +
          `d'inscription (${pct(topRate)}) tout en générant moins de trafic que « ${bigger.label} ».`,
        whyItMatters:
          'Une source plus efficace à trafic moindre indique un levier de conversion, sans supposer de causalité.',
        source: `analytics_sessions:${top.source}`,
        period: input.period,
        scope: input.scope,
        evidence,
        confidence,
        action: isConfidentEnough(confidence)
          ? `Étudier ce qui rend « ${top.label} » plus efficace afin de le reproduire ailleurs.`
          : null,
      }
    }
  }

  /* b) Repli FACTUEL : classement de trafic attribué disponible --------- */
  const ranking = channels.rankings.find((r) => r.key === 'top_traffic_attributed')
  if (ranking && ranking.available && ranking.rows.length >= 1 && ranking.rows[0].value !== null) {
    const topRow = ranking.rows[0]
    return {
      id: SIGNAL_IDS.channelTraffic,
      category: 'CHANNEL_OPPORTUNITY',
      title: 'Source de trafic dominante',
      fact:
        `Parmi les sources attribuées, « ${topRow.label} » génère le plus de trafic Citadelle ` +
        `(${num(topRow.value as number)}).`,
      whyItMatters:
        "Connaître la source de trafic dominante aide à prioriser l'acquisition, sans supposer de causalité.",
      source: 'analytics_sessions',
      period: input.period,
      scope: input.scope,
      evidence: [
        evValue(`Trafic attribué — ${topRow.label}`, topRow.value as number, 'analytics_sessions'),
      ],
      // Fait d'attribution : jamais présenté comme recommandation confiante (≤ MEDIUM).
      confidence: 'MEDIUM',
      action: null,
    }
  }

  return null
}

/* ══════════════════════════════════════════════════════════════════════════
 * RÈGLE 4 — GROWTH / DECLINE (SEULEMENT via tendance native du connecteur)
 * Source : youtubeTrends (période/période fournie par le connecteur).
 * Exige MIN_MATERIAL_DELTA_RATIO ET MIN_ABSOLUTE_VOLUME_FOR_TREND.
 * Langage honnête sur l'attribution (jamais « YouTube a créé X membres »).
 * ════════════════════════════════════════════════════════════════════════ */

export function ruleYouTubeTrend(input: SignalsBuildInput): DecisionSignal | null {
  const t = input.youtubeTrends
  if (!t) return null
  const views = t.views
  if (
    views.previous === null ||
    views.previous <= 0 ||
    typeof views.delta !== 'number' ||
    !Number.isFinite(views.delta)
  ) {
    return null
  }
  const delta = views.delta
  const current = views.current
  if (Math.abs(delta) < MIN_MATERIAL_DELTA_RATIO || current < MIN_ABSOLUTE_VOLUME_FOR_TREND) {
    return null
  }

  const evidence: SignalEvidenceItem[] = [
    evValue('Vues YouTube (période)', current, 'youtube_analytics'),
    evValue('Vues YouTube (période précédente)', views.previous, 'youtube_analytics'),
  ]
  const isGrowth = delta > 0
  // Métrique de PLATEFORME : jamais un résultat Citadelle ⇒ plafond MEDIUM,
  // donc jamais action prioritaire (qui exige HIGH).
  const confidence: ConfidenceState = 'MEDIUM'
  // La portée est celle de la plateforme externe, pas du périmètre Citadelle.
  const scope: DecisionScope = 'external_or_unknown'
  // La donnée est une fenêtre de PLATEFORME (28 j), jamais « aujourd'hui ».
  const period = input.platformPeriod ?? input.period

  if (isGrowth) {
    return {
      id: SIGNAL_IDS.youtubeGrowth,
      category: 'GROWTH',
      title: 'Audience YouTube en progression',
      fact:
        `Sur la période, l'audience YouTube progresse (${signedPct(delta)}, ` +
        `${num(views.previous)} → ${num(current)} vues), mais son attribution vers Citadelle reste faible.`,
      whyItMatters:
        "La progression d'audience est une métrique de plateforme ; elle ne se traduit pas directement en résultat Citadelle.",
      source: 'youtube_analytics',
      period,
      scope,
      evidence,
      confidence,
      action: null,
    }
  }
  return {
    id: SIGNAL_IDS.youtubeDecline,
    category: 'DECLINE',
    title: 'Audience YouTube en recul',
    fact:
      `Sur la période, l'audience YouTube recule (${signedPct(delta)}, ` +
      `${num(views.previous)} → ${num(current)} vues) ; l'impact direct sur Citadelle n'est pas mesurable ici.`,
    whyItMatters:
      "Le recul d'audience est une métrique de plateforme ; il n'implique pas mécaniquement un effet Citadelle.",
    source: 'youtube_analytics',
    period,
    scope,
    evidence,
    confidence,
    action: null,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * RÈGLE 5 — SEO insuffisant ⇒ DATA_QUALITY (échantillon insuffisant)
 * ════════════════════════════════════════════════════════════════════════ */

export function ruleSeoInsufficient(input: SignalsBuildInput): DecisionSignal | null {
  if (!input.seoInsufficient) return null
  return {
    id: SIGNAL_IDS.seoInsufficient,
    category: 'DATA_QUALITY',
    title: 'Search Console : échantillon insuffisant',
    fact:
      "Search Console ne fournit pas encore assez de données sur la période pour conclure.",
    whyItMatters:
      "Sur un échantillon aussi faible, toute lecture SEO serait non concluante.",
    source: 'google_search_console',
    period: input.period,
    scope: input.scope,
    evidence: [
      evMissing(
        'Requêtes Search Console',
        'NO_DATA',
        'Échantillon encore insuffisant sur la période',
        'google_search_console',
      ),
    ],
    confidence: 'INSUFFICIENT_DATA',
    action: null,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * RÈGLE 6 — DATA_QUALITY (lacunes d'instrumentation) via dataQuality.toInstrument
 * ════════════════════════════════════════════════════════════════════════ */

export function ruleDataQualityGaps(input: SignalsBuildInput): DecisionSignal | null {
  const gaps = input.dataQuality.toInstrument
  if (!gaps || gaps.length === 0) return null
  const evidence: SignalEvidenceItem[] = gaps.map((g) =>
    evMissing(g.label, 'UNAVAILABLE', g.detail, 'event_contract'),
  )
  const cov = input.dataQuality.coverage
  return {
    id: SIGNAL_IDS.instrumentationGaps,
    category: 'DATA_QUALITY',
    title: 'Étapes non encore instrumentées',
    fact:
      `Certaines étapes ne sont pas encore mesurées : ` +
      `${gaps.map((g) => `« ${g.label} »`).join(', ')}.`,
    whyItMatters:
      `Sans instrumentation, ces étapes ne peuvent être ni mesurées ni comparées ` +
      `(couverture : ${cov.available} mesurées / ${cov.partial} partielles / ${cov.gap} manquantes sur ${cov.total}).`,
    source: 'event_contract',
    period: input.period,
    scope: input.scope,
    evidence,
    confidence: 'INSUFFICIENT_DATA',
    action: null,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * RÈGLE 7 — CONNECTOR_STATUS (honnête, jamais alarmiste)
 * ════════════════════════════════════════════════════════════════════════ */

const CONNECTOR_HEALTHY_STATES = new Set(['PASS', 'CONNECTED', 'OK', 'ACTIVE', 'REAL'])

export function ruleConnectorStatus(input: SignalsBuildInput): DecisionSignal | null {
  const statuses = input.connectorStatuses ?? []
  const needsAttention = statuses.filter(
    (s) => s.setupRequired === true || !CONNECTOR_HEALTHY_STATES.has(s.state.toUpperCase()),
  )
  if (needsAttention.length === 0) return null
  const evidence: SignalEvidenceItem[] = needsAttention.map((s) =>
    evMissing(s.label, 'UNAVAILABLE', `État : ${s.state}`, s.channel),
  )
  return {
    id: SIGNAL_IDS.connectorStatus,
    category: 'CONNECTOR_STATUS',
    title: 'Connecteurs à configurer ou indisponibles',
    fact:
      `Sources non exploitables sur la période : ` +
      `${needsAttention.map((s) => `${s.label} (${s.state})`).join(', ')}.`,
    whyItMatters:
      "Ces sources n'alimentent pas encore la décision ; leur absence est signalée, sans en tirer de conclusion.",
    source: needsAttention.map((s) => s.channel).join(', '),
    period: input.period,
    scope: input.scope,
    evidence,
    // Informatif : jamais une recommandation confiante ni une action prioritaire.
    confidence: 'LOW',
    action: null,
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * RÈGLE 8 — CONTENT_SIGNAL (FACTUEL uniquement, jamais un sujet recommandé)
 * ════════════════════════════════════════════════════════════════════════ */

export function ruleContentSignal(input: SignalsBuildInput): DecisionSignal | null {
  const c = input.content
  if (!c) return null
  const yt = c.mostViewedYouTube
  const pod = c.mostListenedPodcast
  if (yt && Number.isFinite(yt.views)) {
    return {
      id: SIGNAL_IDS.content,
      category: 'CONTENT_SIGNAL',
      title: 'Contenu le plus vu (YouTube)',
      fact:
        `Sur la période, la vidéo la plus vue est « ${yt.title} » (${num(yt.views)} vues).`,
      whyItMatters:
        "Fait d'audience observé ; aucune préférence de sujet ni recommandation éditoriale n'en est déduite.",
      source: yt.source,
      // Donnée de PLATEFORME (28 j) : jamais étiquetée « aujourd'hui ».
      period: input.platformPeriod ?? input.period,
      scope: 'external_or_unknown',
      evidence: [evValue('Vues', yt.views, yt.source)],
      confidence: 'LOW',
      action: null,
    }
  }
  if (pod && Number.isFinite(pod.plays)) {
    return {
      id: SIGNAL_IDS.content,
      category: 'CONTENT_SIGNAL',
      title: 'Contenu le plus écouté (podcast)',
      fact:
        `Sur la période, l'épisode le plus écouté est « ${pod.title} » (${num(pod.plays)} écoutes).`,
      whyItMatters:
        "Fait d'écoute observé ; aucune préférence de sujet ni recommandation éditoriale n'en est déduite.",
      source: pod.source,
      period: input.period,
      scope: input.scope,
      evidence: [evValue('Écoutes', pod.plays, pod.source)],
      confidence: 'LOW',
      action: null,
    }
  }
  return null
}

/* ══════════════════════════════════════════════════════════════════════════
 * Collection ordonnée des règles (pour l'orchestration)
 * ════════════════════════════════════════════════════════════════════════ */

export const SIGNAL_RULES: ReadonlyArray<(input: SignalsBuildInput) => DecisionSignal | null> = [
  ruleDropOff,
  ruleConversion,
  ruleChannelOpportunity,
  ruleYouTubeTrend,
  ruleSeoInsufficient,
  ruleDataQualityGaps,
  ruleConnectorStatus,
  ruleContentSignal,
]

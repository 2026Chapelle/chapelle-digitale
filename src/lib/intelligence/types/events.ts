/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Contrat canonique des ÉVÉNEMENTS first-party.
 *
 * IMPORTANT (décision d'architecture, cf. revue transverse Agent 8) :
 * ce contrat est un contrat de LECTURE / NORMALISATION. Il ne crée PAS une
 * nouvelle table d'ingestion `intelligence_events`. Chaque événement canonique
 * est mappé sur une source de vérité EXISTANTE (adapter → MetricEnvelope).
 * On documente ici : catégorie, source de vérité, fraîcheur, disponibilité.
 *
 * Objectif Phase 0 = DATA BEFORE DECORATION : savoir quelles données existent,
 * qui en est la source, et leur fraîcheur — pas instrumenter toutes les pages.
 */

import type { Freshness } from './freshness'

/** Vocabulaire canonique des événements Citadelle. */
export const FIRST_PARTY_EVENTS = [
  // Audience
  'page_view',
  'session_start',
  // Acquisition / compte
  'signup_start',
  'signup_complete',
  'login',
  // Live
  'live_view_start',
  'live_view_30s',
  'live_view_5m',
  'live_complete',
  // Podcast
  'podcast_play',
  'podcast_complete',
  // Documents / PDF
  'pdf_open',
  'pdf_progress',
  'pdf_complete',
  // Parcours / formation
  'parcours_start',
  'lesson_start',
  'lesson_complete',
  // Conversion / engagement
  'cta_click',
  'outbound_click',
] as const

export type FirstPartyEventName = (typeof FIRST_PARTY_EVENTS)[number]

export type EventCategory =
  | 'audience'
  | 'acquisition'
  | 'live'
  | 'podcast'
  | 'document'
  | 'parcours'
  | 'conversion'

/**
 * Disponibilité de la source de vérité aujourd'hui :
 * - available : capté et exploitable tel quel.
 * - partial   : capté partiellement (proxy / granularité incomplète).
 * - gap       : non capté aujourd'hui → à instrumenter dans une phase ultérieure.
 */
export type EventAvailability = 'available' | 'partial' | 'gap'

export interface EventContractEntry {
  name: FirstPartyEventName
  category: EventCategory
  /** Source de vérité EXISTANTE (table / endpoint) — jamais recréée en Phase 0. */
  sourceOfTruth: string
  freshness: Freshness
  availability: EventAvailability
  /** Note d'adaptation (comment mapper la donnée existante vers l'enveloppe). */
  note: string
}

/**
 * Cartographie événement → source existante. C'est le cœur "evidence-first" de la
 * Phase 0 : chaque ligne s'appuie sur l'audit (analytics_events, activity_logs,
 * audio_listening_events, video_progress, module_completions…).
 */
export const EVENT_CONTRACT: Readonly<Record<FirstPartyEventName, EventContractEntry>> = {
  page_view: {
    name: 'page_view',
    category: 'audience',
    sourceOfTruth: 'public.analytics_events (type=page_view) + analytics_sessions',
    freshness: 'NEAR_REALTIME',
    availability: 'available',
    note: 'AnalyticsTracker → /api/analytics/track (heartbeat + pageview par route).',
  },
  session_start: {
    name: 'session_start',
    category: 'audience',
    sourceOfTruth: 'public.analytics_sessions (session_key)',
    freshness: 'NEAR_REALTIME',
    availability: 'available',
    note: 'Upsert de présence par clé de session (pas d’IP stockée).',
  },
  signup_start: {
    name: 'signup_start',
    category: 'acquisition',
    sourceOfTruth: 'chapelle.analytics_events (join_funnel_step) / public.analytics_events',
    freshness: 'NEAR_REALTIME',
    availability: 'partial',
    note: 'Étape de tunnel présente ; granularité "start" à confirmer côté funnel.',
  },
  signup_complete: {
    name: 'signup_complete',
    category: 'acquisition',
    sourceOfTruth: 'profiles (création) + analytics_events',
    freshness: 'SYNCED',
    availability: 'available',
    note: 'Création de compte observable ; joindre en agrégat, jamais la PII brute.',
  },
  login: {
    name: 'login',
    category: 'acquisition',
    sourceOfTruth: 'analytics_events (login) / auth',
    freshness: 'NEAR_REALTIME',
    availability: 'partial',
    note: 'Signal de connexion à normaliser depuis le flux analytics.',
  },
  live_view_start: {
    name: 'live_view_start',
    category: 'live',
    sourceOfTruth: 'public.activity_logs (action=live_view) via /api/activity',
    freshness: 'NEAR_REALTIME',
    availability: 'available',
    note: 'Beacon live_view déjà émis par la page lives membre.',
  },
  live_view_30s: {
    name: 'live_view_30s',
    category: 'live',
    sourceOfTruth: 'activity_logs + heartbeat analytics (durée active)',
    freshness: 'NEAR_REALTIME',
    availability: 'partial',
    note: 'Seuils de rétention (30s) dérivables du heartbeat ; pas de palier dédié aujourd’hui.',
  },
  live_view_5m: {
    name: 'live_view_5m',
    category: 'live',
    sourceOfTruth: 'activity_logs + heartbeat analytics (durée active)',
    freshness: 'NEAR_REALTIME',
    availability: 'partial',
    note: 'Palier 5 min dérivable de la durée de session ; à formaliser.',
  },
  live_complete: {
    name: 'live_complete',
    category: 'live',
    sourceOfTruth: 'activity_logs',
    freshness: 'SYNCED',
    availability: 'gap',
    note: 'Fin de visionnage live non explicitement marquée aujourd’hui.',
  },
  podcast_play: {
    name: 'podcast_play',
    category: 'podcast',
    sourceOfTruth: 'public.audio_listening_events (play_start/play_resume)',
    freshness: 'NEAR_REALTIME',
    availability: 'available',
    note: 'Flux audio instrumenté + lib pure aggregateAudioAnalytics.',
  },
  podcast_complete: {
    name: 'podcast_complete',
    category: 'podcast',
    sourceOfTruth: 'public.audio_listening_events (completed / checkpoint 95%)',
    freshness: 'NEAR_REALTIME',
    availability: 'available',
    note: 'Complétion audio déjà agrégée (completion_rate).',
  },
  pdf_open: {
    name: 'pdf_open',
    category: 'document',
    sourceOfTruth: 'public.activity_logs (action=pdf_download) via /api/activity',
    freshness: 'NEAR_REALTIME',
    availability: 'partial',
    note: 'Téléchargement/ouverture PDF capté ; "open" lecteur à préciser.',
  },
  pdf_progress: {
    name: 'pdf_progress',
    category: 'document',
    sourceOfTruth: '(aucune) — pas de document_progress aujourd’hui',
    freshness: 'SYNCED',
    availability: 'gap',
    note: 'Progression de lecture PDF non captée (gap PDF-3 documenté).',
  },
  pdf_complete: {
    name: 'pdf_complete',
    category: 'document',
    sourceOfTruth: '(aucune) — pas de document_progress aujourd’hui',
    freshness: 'SYNCED',
    availability: 'gap',
    note: 'Fin de lecture PDF non captée (gap).',
  },
  parcours_start: {
    name: 'parcours_start',
    category: 'parcours',
    sourceOfTruth: 'inscriptions_formation / parcours_formations',
    freshness: 'SYNCED',
    availability: 'available',
    note: 'Inscription à un parcours/formation observable.',
  },
  lesson_start: {
    name: 'lesson_start',
    category: 'parcours',
    sourceOfTruth: 'video_progress (première position > 0)',
    freshness: 'SYNCED',
    availability: 'partial',
    note: 'Début de leçon dérivable du suivi vidéo (ModuleVideoPlayer).',
  },
  lesson_complete: {
    name: 'lesson_complete',
    category: 'parcours',
    sourceOfTruth: 'module_completions / video_progress (completed=true)',
    freshness: 'SYNCED',
    availability: 'available',
    note: 'Complétion de module/leçon déjà persistée.',
  },
  cta_click: {
    name: 'cta_click',
    category: 'conversion',
    sourceOfTruth: 'analytics_events (category don/live/formation/…)',
    freshness: 'NEAR_REALTIME',
    availability: 'available',
    note: 'Clics classés par catégorie via capture déléguée (AnalyticsTracker).',
  },
  outbound_click: {
    name: 'outbound_click',
    category: 'conversion',
    sourceOfTruth: 'analytics_events (liens sortants)',
    freshness: 'NEAR_REALTIME',
    availability: 'partial',
    note: 'Clics sortants (réseaux, wa.me, sharer) partiellement captés ; à formaliser.',
  },
}

export function isFirstPartyEvent(value: unknown): value is FirstPartyEventName {
  return typeof value === 'string' && (FIRST_PARTY_EVENTS as readonly string[]).includes(value)
}

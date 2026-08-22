/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Modèle COMMUN et normalisé de statut des canaux/connecteurs.
 *
 * Contrat unique partagé par tous les chantiers HUB-4 (nav/statut, YouTube, Meta,
 * WhatsApp, conversions) : l'UI ne doit JAMAIS coder en dur un état ni mentir.
 * Chaque source déclare son état réel, sa fraîcheur, sa dernière synchro et, si
 * une action est requise, l'action exacte — sans jamais exposer de secret.
 */

import type { Freshness } from '../types/freshness'

/** Canaux/sources gérés par le hub. */
export const CHANNEL_IDS = [
  'first_party',
  'google_search_console',
  'google_analytics',
  'youtube',
  'meta_facebook',
  'meta_instagram',
  'whatsapp',
] as const

export type ChannelId = (typeof CHANNEL_IDS)[number]

/**
 * États normalisés d'un canal. Distinction stricte :
 *  - CONNECTED : connecteur externe authentifié, données réelles servies.
 *  - ACTIVE : source first-party opérationnelle (ex. attribution WhatsApp).
 *  - NOT_CONFIGURED : rien n'est configuré (état honnête de 1ère classe).
 *  - AUTH_REQUIRED : credentials présents mais consentement/refresh manquant.
 *  - PERMISSION_REQUIRED : authentifié mais permissions insuffisantes.
 *  - ERROR : échec d'appel (raison non sensible).
 *  - UNAVAILABLE : donnée indisponible par nature (≠ zéro réel).
 */
export const CHANNEL_STATES = [
  'CONNECTED',
  'ACTIVE',
  'NOT_CONFIGURED',
  'AUTH_REQUIRED',
  'PERMISSION_REQUIRED',
  'ERROR',
  'UNAVAILABLE',
] as const

export type ChannelState = (typeof CHANNEL_STATES)[number]

/** Un canal est-il « vivant » (sert des données réelles) ? */
export function isLiveState(state: ChannelState): boolean {
  return state === 'CONNECTED' || state === 'ACTIVE'
}

/** Statut public (non sensible) d'un canal — jamais de secret/token. */
export interface ChannelStatus {
  channel: ChannelId
  displayName: string
  state: ChannelState
  freshness: Freshness
  /** Instant de dernière synchro réelle (ISO) ou null si jamais. */
  lastSync: string | null
  /** Message humain non sensible (jamais de clé/token). */
  reason?: string
  /** true si une action de configuration humaine est requise. */
  setupRequired?: boolean
  /** Identifiant public de la propriété résolue (ex. sc-domain, GA4 id). */
  property?: string
  /** Instant de vérification (ISO). */
  checkedAt: string
}

/** Libellés FR des états (pour l'UI). */
export const CHANNEL_STATE_LABEL_FR: Record<ChannelState, string> = {
  CONNECTED: 'Connecté',
  ACTIVE: 'Actif',
  NOT_CONFIGURED: 'Non configuré',
  AUTH_REQUIRED: 'Authentification requise',
  PERMISSION_REQUIRED: 'Permission requise',
  ERROR: 'Erreur',
  UNAVAILABLE: 'Indisponible',
}

/** Couleur indicative par état (cohérente avec la charte cockpit). */
export const CHANNEL_STATE_COLOR: Record<ChannelState, string> = {
  CONNECTED: '#4ade80',
  ACTIVE: '#4ade80',
  NOT_CONFIGURED: '#9ca3af',
  AUTH_REQUIRED: '#fbbf24',
  PERMISSION_REQUIRED: '#fbbf24',
  ERROR: '#f87171',
  UNAVAILABLE: '#9ca3af',
}

/** Réponse agrégée de /api/intelligence/status (admin-only). */
export interface ChannelStatusReport {
  generatedAt: string
  channels: ReadonlyArray<ChannelStatus>
}

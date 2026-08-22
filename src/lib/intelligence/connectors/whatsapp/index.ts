/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · WhatsApp attribution (SERVER-ONLY safe / PURE)
 *
 * L'attribution WhatsApp est FIRST-PARTY (UTM / referrer canal WhatsApp / session)
 * — aucune API externe requise pour le niveau de base. Elle est donc ACTIVE dès que
 * l'attribution first-party fonctionne. Signature stable importée par la route statut
 * et l'onglet WhatsApp. Le calcul first-party vit dans `./attribution` (PUR).
 *
 * Canal officiel (public) : https://whatsapp.com/channel/0029VbCGBmkH5JLuUSYkax3B
 * — CANAL de diffusion, PAS un lien wa.me de conversation. READ-ONLY.
 *
 * WhatsApp Cloud API (WABA) = OPTIONNEL : sans credentials WABA triviales ici, on ne
 * bloque JAMAIS — l'attribution first-party est le livrable. Voir getWhatsAppCloudStatus.
 */

import type { ChannelStatus } from '../../channels/types'

export {
  buildWhatsAppAttribution,
  WHATSAPP_CHANNEL_URL,
  type WhatsAppAttributionResult,
  type WhatsAppCampaignRow,
  type WhatsAppCounts,
  type BuildWhatsAppAttributionInput,
} from './attribution'

/**
 * Statut WhatsApp : ACTIVE (attribution first-party disponible par nature).
 * Ne dépend d'AUCUN secret ni réseau — l'attribution s'appuie sur les sessions
 * first-party déjà collectées. `nowIso` injecté (déterministe/testable).
 */
export async function getWhatsAppStatus(nowIso: string): Promise<ChannelStatus> {
  return {
    channel: 'whatsapp',
    displayName: 'WhatsApp (attribution)',
    state: 'ACTIVE',
    freshness: 'NEAR_REALTIME',
    lastSync: nowIso,
    reason: 'Attribution first-party opérationnelle (UTM / referrer canal WhatsApp / session).',
    checkedAt: nowIso,
  }
}

/** État OPTIONNEL de WhatsApp Cloud API (WABA). Non requis ; jamais bloquant. */
export type WhatsAppCloudState = 'NOT_CONFIGURED' | 'OPTIONAL'

/**
 * Statut informatif de l'extension Cloud API (messages/templates). Elle n'est PAS
 * nécessaire à l'attribution first-party ; on la déclare OPTIONNELLE et non configurée
 * tant qu'aucun WABA n'est fourni (aucun secret lu ici).
 */
export function getWhatsAppCloudStatus(): { state: WhatsAppCloudState; reason: string } {
  return {
    state: 'OPTIONAL',
    reason:
      'WhatsApp Cloud API (WABA) optionnel — non requis pour l’attribution first-party ; non configuré.',
  }
}

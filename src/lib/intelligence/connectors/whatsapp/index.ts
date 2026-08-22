/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · WhatsApp attribution (SERVER-ONLY)
 *
 * ⚠️ STUB DE COORDINATION (chantier 3 remplit l'implémentation).
 * L'attribution WhatsApp est FIRST-PARTY (UTM / referrer canal WhatsApp / session)
 * — pas d'API externe requise pour le niveau de base. Elle est donc ACTIVE dès que
 * l'attribution first-party fonctionne. Signature stable importée par la route
 * statut (chantier 1) et l'onglet WhatsApp.
 *
 * Canal officiel : https://whatsapp.com/channel/0029VbCGBmkH5JLuUSYkax3B
 * (canal de diffusion — PAS un lien wa.me de conversation). READ-ONLY.
 */

import type { ChannelStatus } from '../../channels/types'

/** Statut WhatsApp. STUB : ACTIVE (attribution first-party disponible par nature). */
export async function getWhatsAppStatus(nowIso: string): Promise<ChannelStatus> {
  return {
    channel: 'whatsapp',
    displayName: 'WhatsApp (attribution)',
    state: 'ACTIVE',
    freshness: 'NEAR_REALTIME',
    lastSync: nowIso,
    reason: 'Attribution first-party (UTM / referrer / session).',
    checkedAt: nowIso,
  }
}

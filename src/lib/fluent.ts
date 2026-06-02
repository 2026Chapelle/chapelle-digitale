/**
 * Intégration FluentCRM + Fluent Forms (WordPress) — couche partagée.
 *
 * Architecture :
 *   Page React  ──>  POST /api/tunnel/lead  ──>  FluentCRM REST API
 *
 * On NE poste jamais directement vers WordPress depuis le navigateur (les
 * identifiants Application Password resteraient exposés). Le formulaire envoie
 * au route handler Next (/api/tunnel/lead) qui relaie côté serveur.
 *
 * Variables d'environnement (à définir dans N0C / .env.local) :
 *   FLUENTCRM_BASE_URL   ex: https://chapelleduroyaume.org
 *   FLUENTCRM_USERNAME   utilisateur WP avec accès FluentCRM
 *   FLUENTCRM_PASSWORD   « Application Password » WordPress
 *   FLUENTCRM_LIST_ID    (optionnel) id de liste par défaut
 *
 * Si non configuré → mode démo : la soumission est acceptée (UX intacte) mais
 * aucune requête externe n'est émise. Voir /api/tunnel/lead.
 */
import type { TunnelStageKey } from '@/lib/tunnel'

export interface TunnelLeadPayload {
  /** Prénom — requis. */
  prenom: string
  /** Email — requis. */
  email: string
  /** Nom de famille — optionnel. */
  nom?: string
  /** Téléphone (WhatsApp) — optionnel mais précieux pour le suivi. */
  telephone?: string
  /** Pays — optionnel. */
  pays?: string
  /** Étape du tunnel d'où vient le lead (sert au tag FluentCRM). */
  stage: TunnelStageKey
  /** Identifiant du formulaire source (ex: 'integration', 'servir'). */
  source: string
  /** Message libre éventuel. */
  message?: string
  /** Centres d'intérêt / équipes cochés. */
  interets?: string[]
}

export interface TunnelLeadResult {
  ok: boolean
  /** true si relayé vers FluentCRM, false si mode démo. */
  delivered: boolean
  message: string
}

/**
 * Envoie un lead du tunnel vers notre API (qui relaie vers FluentCRM).
 * À utiliser depuis les composants formulaire client.
 */
export async function submitTunnelLead(
  payload: TunnelLeadPayload,
): Promise<TunnelLeadResult> {
  try {
    const res = await fetch('/api/tunnel/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = (await res.json()) as TunnelLeadResult
    return data
  } catch {
    return {
      ok: false,
      delivered: false,
      message: "Connexion impossible. Réessayez dans un instant.",
    }
  }
}

/** Validation email légère côté client. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

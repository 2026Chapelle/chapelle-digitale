/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Meta · AUTH (durcissement READ-ONLY) SERVER-ONLY
 *
 * Meta Graph API READ-ONLY : aucun flux OAuth interactif ne peut être mené par ce
 * service (créer l'app Business + consentement du propriétaire est une action
 * humaine hors périmètre). On consomme donc un Page/User token long-lived FOURNI
 * en environnement serveur. Ce module n'apporte qu'un durcissement facultatif :
 *  - `appsecret_proof` = HMAC-SHA256(access_token, app_secret) — recommandé par Meta
 *    pour lier l'appel à l'app et réduire le risque de rejeu d'un token volé.
 * Aucun secret n'est journalisé ni renvoyé.
 */

import 'server-only'
import { createHmac } from 'crypto'

/**
 * Calcule l'appsecret_proof à joindre aux appels Graph (facultatif mais recommandé).
 * Renvoie null si l'app secret est absent (l'appel reste possible sans proof).
 */
export function buildAppSecretProof(accessToken: string, appSecret: string | null): string | null {
  if (!appSecret) return null
  return createHmac('sha256', appSecret).update(accessToken).digest('hex')
}

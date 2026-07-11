/**
 * Configuration Relying Party (RP) WebAuthn — dérivée de la config SERVEUR
 * (NEXT_PUBLIC_APP_URL / APP_URL), jamais du corps de requête client.
 *
 * `expectedOrigin` et `expectedRPID` passés à SimpleWebAuthn viennent d'ici.
 * En production : origin = https://citadelle.chapelleduroyaume.org, rpID = son hostname.
 * En dev : localhost:3000 (rpID « localhost ») pour permettre les essais locaux.
 */
import { APP_NAME, APP_URL } from '@/lib/constants'
import { deriveOrigin, deriveRpId } from './ceremony'

const IS_PROD = process.env.NODE_ENV === 'production'

export const RP_ID = IS_PROD ? deriveRpId(APP_URL) : 'localhost'
export const RP_NAME = APP_NAME
export const RP_ORIGIN = IS_PROD
  ? deriveOrigin(APP_URL)
  : process.env.NEXT_PUBLIC_APP_URL
    ? deriveOrigin(process.env.NEXT_PUBLIC_APP_URL)
    : 'http://localhost:3000'

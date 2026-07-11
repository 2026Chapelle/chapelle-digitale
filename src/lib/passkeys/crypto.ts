/**
 * Utilitaires cryptographiques serveur (Node) pour les passkeys.
 * - `hashChallenge` : on ne stocke JAMAIS le challenge en clair, seulement son
 *   empreinte SHA-256. À la vérification, on hache le challenge présenté par le
 *   client et on compare à l'empreinte stockée (fonction `expectedChallenge`).
 * - conversions base64url ⇆ octets pour la clé PUBLIQUE COSE et les identifiants.
 */
import { createHash, randomUUID } from 'node:crypto'

export function hashChallenge(challenge: string): string {
  return createHash('sha256').update(challenge).digest('hex')
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url')
}

export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  // Copie dans un ArrayBuffer neuf (type Uint8Array<ArrayBuffer> attendu par la lib).
  const buf = Buffer.from(value, 'base64url')
  const out = new Uint8Array(buf.byteLength)
  out.set(buf)
  return out
}

export { randomUUID }

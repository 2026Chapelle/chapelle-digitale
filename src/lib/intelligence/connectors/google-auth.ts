/**
 * CITADELLE INTELLIGENCE HUB — SEO · Auth Google SERVER-ONLY (partagée)
 *
 * Helper minimal service-account → access token, SANS nouvelle dépendance npm :
 * signature JWT RS256 via le module `crypto` natif de Node, échange auprès du
 * endpoint OAuth2. Importé par les connecteurs Search Console ET GA4 pour éviter
 * toute duplication de la logique d'auth.
 *
 * SÉCURITÉ ABSOLUE :
 *  - `import 'server-only'` : ce module ne peut JAMAIS être inclus côté client.
 *  - aucun secret n'est journalisé, renvoyé, ni exposé.
 *  - `fetchImpl` est injectable pour des tests 100 % hors-ligne (mock réseau).
 */

import 'server-only'
import { createSign } from 'crypto'

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** Identité service-account (jamais journalisée). */
export interface ServiceAccount {
  client_email: string
  private_key: string
}

export type FetchImpl = typeof fetch

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Construit un JWT signé RS256 pour l'échange OAuth2 (grant assertion).
 * `nowSec` injecté pour rester déterministe/testable.
 */
export function buildServiceAccountJwt(
  sa: ServiceAccount,
  scopes: ReadonlyArray<string>,
  nowSec: number,
): string {
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: OAUTH_TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  }
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  // Les clés PEM stockées en env ont souvent des \n littéraux : on les restaure.
  const pem = sa.private_key.includes('\\n')
    ? sa.private_key.replace(/\\n/g, '\n')
    : sa.private_key
  const signature = base64url(signer.sign(pem))
  return `${unsigned}.${signature}`
}

export interface AccessTokenResult {
  accessToken: string
  /** Instant d'expiration (ms epoch). */
  expiresAtMs: number
}

/**
 * Échange une assertion JWT contre un access token OAuth2 (read-only scopes).
 * Lève en cas d'échec — l'appelant traduit en statut NOT_CONFIGURED/ERROR, jamais
 * en donnée inventée.
 */
export async function getAccessToken(
  sa: ServiceAccount,
  scopes: ReadonlyArray<string>,
  opts: { nowMs: number; fetchImpl?: FetchImpl },
): Promise<AccessTokenResult> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const nowSec = Math.floor(opts.nowMs / 1000)
  const assertion = buildServiceAccountJwt(sa, scopes, nowSec)
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })
  const res = await fetchImpl(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    throw new Error(`oauth_token_http_${res.status}`)
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) {
    throw new Error('oauth_token_missing')
  }
  return {
    accessToken: json.access_token,
    expiresAtMs: opts.nowMs + (json.expires_in ?? 3600) * 1000,
  }
}

/**
 * Charge une service-account depuis une variable d'environnement JSON (server-only).
 * Renvoie null si absente/malformée — JAMAIS d'exception au chargement, pour
 * permettre l'état honnête NOT_CONFIGURED. N'expose jamais la clé.
 */
export function loadServiceAccountFromEnv(rawJson: string | undefined): ServiceAccount | null {
  if (!rawJson || !rawJson.trim()) return null
  try {
    const parsed = JSON.parse(rawJson) as Partial<ServiceAccount>
    if (typeof parsed.client_email === 'string' && typeof parsed.private_key === 'string') {
      return { client_email: parsed.client_email, private_key: parsed.private_key }
    }
    return null
  } catch {
    return null
  }
}

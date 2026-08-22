/**
 * CITADELLE INTELLIGENCE HUB — HUB-4 · Meta (Facebook/Instagram) · CONFIG SERVER-ONLY
 *
 * Résolution de la configuration Meta depuis l'environnement SERVEUR uniquement.
 * Aucune valeur secrète n'est jamais renvoyée : on n'expose que la PRÉSENCE d'un
 * secret (booléens) et des identifiants PUBLICS (page id, rôle, nom canonique).
 *
 * Assets canoniques (confirmés Doxa 2026-08-22 — jamais auto-sélectionner un autre) :
 *  - Facebook CHAPELLE       (institutional)        facebook.com/Chapelleduroyaume
 *  - Facebook CITADELLE      (digital_acquisition)  page id 61592932298568
 *  - Instagram media         (digital_media_acquisition) @chapelleduroyaume.media
 *
 * Convention d'env (SERVER-ONLY, jamais NEXT_PUBLIC) :
 *  - META_APP_ID              (public app id — non secret mais garde côté serveur)
 *  - META_APP_SECRET          (secret — sert au calcul appsecret_proof, jamais renvoyé)
 *  - META_PAGE_TOKEN_CITADELLE (Page access token long-lived, read-only insights)
 *  - META_PAGE_TOKEN_CHAPELLE  (Page access token long-lived, read-only insights)
 *  - META_PAGE_ID_CHAPELLE     (id de la page Chapelle — résoluble une fois, à figer ici)
 *  - META_IG_USER_ID           (IG User id lié au compte @chapelleduroyaume.media)
 *  - META_IG_TOKEN             (token portant instagram_basic / instagram_manage_insights ;
 *                               à défaut, réutilise un Page token relié au compte IG)
 */

import 'server-only'

/** Rôles éditoriaux stricts des pages Meta (jamais fusionnés/perdus). */
export type MetaPageRole = 'institutional' | 'digital_acquisition'
export type MetaIgRole = 'digital_media_acquisition'

/** Identité PUBLIQUE d'une page Facebook (aucun token). */
export interface MetaPageIdentity {
  pageId: string | null
  pageName: string
  pageRole: MetaPageRole
  url: string
}

/** Identité PUBLIQUE du compte Instagram (aucun token). */
export interface MetaIgIdentity {
  igUserId: string | null
  username: string
  role: MetaIgRole
  url: string
}

/** Identités canoniques figées (source de vérité — Doxa 2026-08-22). */
export const CANONICAL_FB_CITADELLE = Object.freeze<MetaPageIdentity>({
  pageId: '61592932298568',
  pageName: 'CITADELLE',
  pageRole: 'digital_acquisition',
  url: 'https://www.facebook.com/profile.php?id=61592932298568',
})

export const CANONICAL_FB_CHAPELLE = Object.freeze<MetaPageIdentity>({
  pageId: null, // résolu depuis META_PAGE_ID_CHAPELLE (ou le token) — jamais deviné
  pageName: 'CHAPELLE',
  pageRole: 'institutional',
  url: 'https://www.facebook.com/Chapelleduroyaume/',
})

export const CANONICAL_IG_MEDIA = Object.freeze<MetaIgIdentity>({
  igUserId: null, // résolu depuis META_IG_USER_ID
  username: 'chapelleduroyaume.media',
  role: 'digital_media_acquisition',
  url: 'https://www.instagram.com/chapelleduroyaume.media/',
})

/** Version du Graph API ciblée (READ-ONLY). */
export const GRAPH_API_VERSION = 'v21.0'
export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

/**
 * Config résolue d'UNE page Facebook. `token`/`appSecret` restent internes au
 * module serveur ; ils ne franchissent jamais la frontière réseau vers le client.
 */
export interface MetaPageConfig {
  identity: MetaPageIdentity
  /** Token présent en env (sinon la page est AUTH_REQUIRED / NOT_CONFIGURED). */
  token: string | null
  hasToken: boolean
}

export interface MetaIgConfig {
  identity: MetaIgIdentity
  token: string | null
  hasToken: boolean
}

export interface MetaConfig {
  appId: string | null
  appSecret: string | null
  hasAppId: boolean
  hasAppSecret: boolean
  /** Les deux pages, TOUJOURS séparées, jamais fusionnées. */
  facebook: {
    citadelle: MetaPageConfig
    chapelle: MetaPageConfig
  }
  instagram: MetaIgConfig
}

function env(name: string): string | null {
  const v = process.env[name]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/**
 * Lit la config Meta depuis l'environnement serveur. Ne renvoie jamais un secret
 * au-delà de ce module (la route publique n'expose que `hasToken`/identités).
 */
export function readMetaConfig(): MetaConfig {
  const appId = env('META_APP_ID')
  const appSecret = env('META_APP_SECRET')
  const tokenCitadelle = env('META_PAGE_TOKEN_CITADELLE')
  const tokenChapelle = env('META_PAGE_TOKEN_CHAPELLE')
  const chapellePageId = env('META_PAGE_ID_CHAPELLE')
  const igUserId = env('META_IG_USER_ID')
  const igToken = env('META_IG_TOKEN') ?? tokenChapelle ?? tokenCitadelle // repli : un Page token relié à l'IG

  return {
    appId,
    appSecret,
    hasAppId: !!appId,
    hasAppSecret: !!appSecret,
    facebook: {
      citadelle: {
        identity: CANONICAL_FB_CITADELLE,
        token: tokenCitadelle,
        hasToken: !!tokenCitadelle,
      },
      chapelle: {
        identity: { ...CANONICAL_FB_CHAPELLE, pageId: chapellePageId ?? CANONICAL_FB_CHAPELLE.pageId },
        token: tokenChapelle,
        hasToken: !!tokenChapelle,
      },
    },
    instagram: {
      identity: { ...CANONICAL_IG_MEDIA, igUserId: igUserId ?? CANONICAL_IG_MEDIA.igUserId },
      token: igToken,
      hasToken: !!igToken && !!igUserId, // IG exige l'id ET un token
    },
  }
}

/** Projection PUBLIQUE d'une identité de page (jamais de token). */
export function publicPageIdentity(cfg: MetaPageConfig): MetaPageIdentity {
  return cfg.identity
}

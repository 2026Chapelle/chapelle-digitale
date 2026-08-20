/**
 * CITADELLE INTELLIGENCE HUB — HUB-2 (First-party attribution)
 * Résolution PURE d'une conversion → source first-touch.
 *
 * Règles (audit data-accuracy) :
 *  - jointure 1:1 sur session_key (unique) prioritaire ;
 *  - sinon session la PLUS ANCIENNE de l'utilisateur (min first_seen) — dédup par
 *    user pour éviter le fan-out multi-sessions ;
 *  - sinon NON attribué (null) — jamais deviné.
 */

import { normalizeAcquisitionSource, type NormalizedSource, type NormalizeOptions } from './normalize'

/** Session brute minimale pour le calcul des visites (source/referrer only). */
export interface RawVisitSession {
  source: string | null
  referrer: string | null
}

/**
 * Ligne de session minimale nécessaire à la résolution (jamais de PII exposée).
 * Les champs UTM (HUB-3) sont optionnels : les lecteurs HUB-2 ne les sélectionnent
 * pas (⇒ undefined), ce qui garde HUB-2 inchangé.
 */
export interface SessionSourceRow {
  session_key: string
  user_id: string | null
  source: string | null
  referrer: string | null
  first_seen: string // ISO
  utm_campaign?: string | null
  utm_medium?: string | null
  utm_content?: string | null
}

/** Clés d'une conversion à attribuer. */
export interface ConversionKey {
  sessionKey?: string | null
  userId?: string | null
}

/** Index de sessions pour résolution : par clé + plus ancienne par utilisateur. */
export interface SessionIndex {
  byKey: Map<string, SessionSourceRow>
  earliestByUser: Map<string, SessionSourceRow>
}

/** Construit l'index à partir d'un lot de sessions. PURE. */
export function buildSessionIndex(rows: ReadonlyArray<SessionSourceRow>): SessionIndex {
  const byKey = new Map<string, SessionSourceRow>()
  const earliestByUser = new Map<string, SessionSourceRow>()
  for (const row of rows) {
    if (row.session_key) byKey.set(row.session_key, row)
    if (row.user_id) {
      const cur = earliestByUser.get(row.user_id)
      if (!cur) {
        earliestByUser.set(row.user_id, row)
      } else {
        const rowT = Date.parse(row.first_seen)
        const curT = Date.parse(cur.first_seen)
        // Départage DÉTERMINISTE sur first_seen égaux : session_key le plus petit gagne.
        if (rowT < curT || (rowT === curT && row.session_key < cur.session_key)) {
          earliestByUser.set(row.user_id, row)
        }
      }
    }
  }
  return { byKey, earliestByUser }
}

/**
 * Résout une conversion en source normalisée, ou null si non attribuable.
 * Priorité : session_key exact → session la plus ancienne de l'utilisateur → null.
 */
export function resolveConversionSource(
  conv: ConversionKey,
  index: SessionIndex,
  opts?: NormalizeOptions,
): NormalizedSource | null {
  if (conv.sessionKey) {
    const s = index.byKey.get(conv.sessionKey)
    if (s) return normalizeAcquisitionSource(s.source, s.referrer, opts)
  }
  if (conv.userId) {
    const s = index.earliestByUser.get(conv.userId)
    if (s) return normalizeAcquisitionSource(s.source, s.referrer, opts)
  }
  return null
}

/** Résout un lot de conversions ; renvoie une liste alignée (source|null). PURE. */
export function resolveConversions(
  conversions: ReadonlyArray<ConversionKey>,
  index: SessionIndex,
  opts?: NormalizeOptions,
): Array<NormalizedSource | null> {
  return conversions.map((c) => resolveConversionSource(c, index, opts))
}

/**
 * Résout une conversion vers sa SESSION first-touch complète (pour l'attribution
 * campagne, qui a besoin de source + campaign + medium + content de la même session).
 * Même priorité : session_key exact → session la plus ancienne de l'utilisateur → null.
 */
export function resolveConversionRow(conv: ConversionKey, index: SessionIndex): SessionSourceRow | null {
  if (conv.sessionKey) {
    const s = index.byKey.get(conv.sessionKey)
    if (s) return s
  }
  if (conv.userId) {
    const s = index.earliestByUser.get(conv.userId)
    if (s) return s
  }
  return null
}

/** Résout un lot de conversions vers leurs sessions first-touch (ou null). PURE. */
export function resolveConversionRows(
  conversions: ReadonlyArray<ConversionKey>,
  index: SessionIndex,
): Array<SessionSourceRow | null> {
  return conversions.map((c) => resolveConversionRow(c, index))
}

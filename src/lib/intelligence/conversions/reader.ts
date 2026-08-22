/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Exécuteur IMPUR des comptages de conversions (service_role only). Réutilise
 * `executeCount` (adapters) : lectures en count(head:true) EXCLUSIVEMENT ⇒ aucune
 * ligne, aucune PII ne transite. Le client Supabase est INJECTÉ (port `CountDb`)
 * pour rester testable sans réseau.
 */

import { executeCount, type CountDb } from '../adapters/supabase-reader'
import type { ConversionCounts } from './categories'
import {
  conversionCountSpecs,
  type ConversionCountKey,
  type ConversionCountWindow,
} from './count-specs'

export type { CountDb }

/** Exécute tous les comptages de conversions en parallèle. */
export async function readConversionCounts(
  db: CountDb,
  window: ConversionCountWindow,
): Promise<ConversionCounts> {
  const specs = conversionCountSpecs(window)
  const keys = Object.keys(specs) as ConversionCountKey[]
  const values = await Promise.all(keys.map((k) => executeCount(db, specs[k])))
  const out = {} as ConversionCounts
  keys.forEach((k, i) => {
    out[k] = values[i]
  })
  return out
}

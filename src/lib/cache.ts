/**
 * Cache mémoire à TTL court — logique PURE & testable (sans I/O).
 *
 * Usage : mutualiser le résultat d'agrégations coûteuses (cockpits admin qui
 * enchaînent de nombreuses requêtes Supabase + calcul) pendant quelques
 * secondes, par CONTEXTE (clé = pays / antenne / portée). Les rechargements
 * rapprochés (rafraîchissement auto du dashboard, plusieurs onglets) ne
 * repaient alors pas tout l'agrégat.
 *
 * Adapté au déploiement PlanetHoster (Passenger = process Node unique) : un
 * simple Map en mémoire suffit. Aucune PII n'y est stockée par les appelants —
 * uniquement des agrégats déjà anonymisés. TTL volontairement court pour rester
 * « temps réel » : la fraîcheur prime sur le taux de hit.
 *
 * `now` est injectable pour des tests déterministes.
 */

interface Entry<T> {
  expires: number
  value: T
}

const STORE = new Map<string, Entry<unknown>>()

/** Horloge par défaut (remplaçable dans les tests). */
const clock = () => Date.now()

/**
 * Renvoie la valeur en cache si encore fraîche, sinon exécute `fn`, mémorise le
 * résultat pour `ttlMs`, et le renvoie. Les appels concurrents sur une clé
 * expirée partagent la MÊME promesse en vol (pas de stampede : une seule
 * exécution de `fn`). Une `fn` qui rejette n'est jamais mise en cache.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  now: () => number = clock,
): Promise<T> {
  const hit = STORE.get(key) as Entry<Promise<T> | T> | undefined
  if (hit && hit.expires > now()) {
    return await (hit.value as Promise<T> | T)
  }
  const p = (async () => fn())()
  // On stocke la PROMESSE pour dédupliquer les appels concurrents.
  STORE.set(key, { expires: now() + ttlMs, value: p })
  try {
    const value = await p
    // Remplace la promesse par la valeur résolue (même échéance).
    const cur = STORE.get(key)
    if (cur && cur.value === p) STORE.set(key, { expires: cur.expires, value })
    return value
  } catch (e) {
    // Échec → on purge pour ne jamais servir une erreur en cache.
    const cur = STORE.get(key)
    if (cur && cur.value === p) STORE.delete(key)
    throw e
  }
}

/** Invalide une clé précise (ex. après une écriture qui change l'agrégat). */
export function invalidate(key: string): void {
  STORE.delete(key)
}

/** Invalide toutes les clés préfixées (ex. `gouvernement:` pour tout un cockpit). */
export function invalidatePrefix(prefix: string): void {
  for (const k of Array.from(STORE.keys())) if (k.startsWith(prefix)) STORE.delete(k)
}

/** Vide tout le cache (tests / maintenance). */
export function clearCache(): void {
  STORE.clear()
}

/** Nombre d'entrées présentes (tests / diagnostic). */
export function cacheSize(): number {
  return STORE.size
}

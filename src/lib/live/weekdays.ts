/**
 * Coercition des jours de récurrence (`live_programs.weekdays`, colonne SQL smallint[]).
 *
 * L'UI admin (champ `tags`) produit des CHAÎNES ("1","3"…). Cette fonction PURE les
 * convertit en entiers 0..6 valides, dédupliqués, dans l'ordre d'apparition. Toute
 * valeur hors domaine ou non numérique est ignorée (la contrainte DB
 * `weekdays <@ {0..6}` reste le garde-fou final).
 *
 * 0=dimanche … 6=samedi. Entrée nulle/vide → [].
 */
export function coerceWeekdays(input: unknown): number[] {
  const raw = Array.isArray(input) ? input : input == null || input === '' ? [] : [input]
  const seen = new Set<number>()
  const out: number[] = []
  for (const v of raw) {
    const n = Number.parseInt(String(v).trim(), 10)
    if (Number.isInteger(n) && n >= 0 && n <= 6 && !seen.has(n)) {
      seen.add(n)
      out.push(n)
    }
  }
  return out
}

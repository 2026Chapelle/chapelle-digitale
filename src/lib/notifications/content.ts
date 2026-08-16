/**
 * NOTIFICATIONS DE PUBLICATION DE CONTENU (back-office → membres).
 *
 * Point unique qui décide « ce contenu vient-il d'être publié pour la 1re fois ?
 * → notifier les membres ». Appelé par les routes CRUD génériques (CMS + LMS)
 * après un insert/update réussi, SANS dupliquer la logique dans chaque page admin.
 *
 * Règles produit (idempotence garantie par `dedupKey`) :
 *   - création brouillon / édition brouillon                → aucune notification
 *   - 1re publication (draft → published)                  → notification membres
 *   - édition d'un contenu déjà publié                     → aucune (statut inchangé)
 *   - dépublication / republication                        → aucun doublon (dedupKey)
 *
 * Les règles PURES (liste blanche, transition) vivent dans `content-rules.ts`
 * (sans dépendance serveur) ; ce module n'ajoute que la diffusion.
 */
import { dispatch } from './channels'
import { CONTENT, isFirstPublishTransition, publishDedupKey } from './content-rules'

export { isNotifiableContent, isFirstPublishTransition, publishDedupKey } from './content-rules'

/**
 * Notifie les membres SI le contenu passe (pour la 1re fois) à l'état publié.
 * `before` = ligne avant écriture (null en création). `after` = ligne persistée.
 * Non bloquant : ne jette jamais (le dispatch avale déjà ses erreurs).
 */
export async function notifyIfFirstPublish(
  table: string,
  before: Record<string, any> | null,
  after: Record<string, any> | null,
): Promise<void> {
  if (!after || !isFirstPublishTransition(table, before, after)) return
  const cfg = CONTENT[table]
  const id = after.id
  if (id == null) return
  const title = String(after.title || after.titre || 'Nouveau contenu').trim()
  const bodyRaw = String(after.excerpt || after.description || after.body || '').trim()

  await dispatch({
    target: { audience: 'members' },
    type: cfg.type,
    title: `${cfg.emoji} Nouveau ${cfg.label} : ${title}`,
    body: bodyRaw ? bodyRaw.slice(0, 140) : undefined,
    href: cfg.href(after),
    dedupKey: publishDedupKey(table, id),
    // Canal in-app uniquement (diffusion `members`) — l'email ne cible que les intents userId.
  })
}

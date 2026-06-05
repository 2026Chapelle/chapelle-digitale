# Livraison — Chantier 3 · LOT 3 (UI Communauté V1)

> Statut : **VALIDÉ GO** (5 agents QA : Architecture, Backend, Sécurité, Fonctionnel, Documentation).

## Surfaces livrées
| Surface | Fichier | APIs | Accès |
|---|---|---|---|
| Admin Groupes (CRUD + membres + demandes) | `src/app/(admin)/admin/groupes/page.tsx` | `/api/admin/groupes` | cookie admin (portée `all`) |
| Espace membre (Mes Groupes / Découvrir / Animation) | `src/app/(member)/member/dashboard/groupes/page.tsx` | `/api/member/groupes` | session + scope |
| Vue Leader (animation locale) | onglet « Animation » de la page membre | `?manage=1`, approve/reject | leader OU périmètre |
| Annuaire public | `src/app/(public)/groupes/page.tsx` | `/api/groupes` (anon) | public, lecture seule |
| Fiche 360° — section Communauté | `src/app/(admin)/admin/membres/[id]/page.tsx` + `member-360-server.ts` | `/api/admin/membres/[id]` | admin |

## Plomberie serveur ajoutée (réutilise le service centralisé)
- `directory()` étendu (filtres plateforme/type/pays/ville) ; `groupsLedBy(uid)` ; `pendingRequestsForGroups(ids)`.
- `/api/groupes` (public) délègue à `directory()` — n'expose aucune liste de membres.
- `/api/member/groupes?manage=1` : union périmètre RBAC + groupes animés (leader) + demandes bornées.
- `member-360-server.ts` : section `communaute` lue depuis `membres_groupe` (et non plus `group_join_requests`).

## Checklist d'acceptation (vérifiée par agents)
- [x] Toutes les routes vérifiées (build OK)
- [x] Membre simple ne voit que ses données (GET borné à `sp.uid`)
- [x] Leader ne voit que son groupe (`groupsLedBy` + `isGroupLeader`, 403 sinon)
- [x] Admin voit tout (cookie super_admin, scope `all`)
- [x] Demandes d'adhésion fonctionnent (join → approve → appartenance + notif)
- [x] `is_primary` fonctionne dans l'UI (badge + bouton + bascule serveur)
- [x] Fiche 360° lit les vraies appartenances (`membres_groupe`)
- [x] Restrictions respectées (pas de réunions/présences/messagerie groupe/stats/multiplication en V1)

## Décisions techniques
- Aucune logique RBAC côté client : l'UI reflète les réponses serveur (`canManage`, 403).
- Route publique réutilise `directory()` (zéro doublon).
- Onglet Animation conditionnel (affiché si `?manage=1` répond ok).
- Self-service borné à `sp.uid`.

## Réserves résiduelles (mineures, non bloquantes)
- `mesActifs`/code mort cosmétique ; `busy` mono-clé (UI) ; bouton « principal » visible pour un ex-membre `sorti` (rejeté serveur) ; `update_infos` (édition horaires leader) disponible côté API mais non câblé en UI (capacité V1+).

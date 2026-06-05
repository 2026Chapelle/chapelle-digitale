# 🏛️ RAPPORT DE STABILISATION P0 — Citadelle (recette réelle, juin 2026)

**Méthode** : 3 workflows d'audit multi-agents (root-cause + vérification adversariale) + relecture manuelle + correctifs additifs (règle des acquis) + type-check / tests / build / ZIP.
**Vérifications** : `tsc --noEmit` ✅ · `vitest` ✅ **294 tests** · `next build` ✅ · `deploy-citadelle.zip` (BUILD_ID `Lr4ZVLRSrswm-xX6nnA3-`).

> Détail d'exécution prod (ordre SQL, vérifs, ZIP, cron, recette par rôle) : **`MEMO-EXECUTION-PRODUCTION.md`**.

## Causes racines transverses
1. **Client anon vs authentifié** : des pages membres lisaient des tables RLS `authenticated` via le client anon → données vides au refresh. Corrigé sur **prières**, **événements** (+ détection auth **/groupes**) via `getBrowserClient()`.
2. **Migrations prod non appliquées** : le code attend des tables absentes. `service_role` (supabaseAdmin) **contourne la RLS** → les « 0 » (analytics) et « table introuvable » (messages) ne sont PAS des bugs RLS mais des tables manquantes en prod.
3. **Handlers/branches manquants** sur du JSX prêt (boutons Lives, CTA groupes).
4. **Profil mis en cache** côté client sans re-sync (rôle/statut).

## Tableau des anomalies

| # | Anomalie | Cause racine | Type | Correctif |
|---|---|---|---|---|
| 1 | Livret 404 | aucune route stable | code | route `/livret-accueil` (redirect `cms_settings`) |
| 2 | Lives Partager/Rappeler | boutons sans handler | code | `ShareButtons` + rappel (.ics + notif) |
| 3 | Réunions notif href | href `/groupes` | code | → `/reunions` |
| 4 | Alertes sonores live | `live_now` jamais émis | cron/config | cron `/api/cron/notifications` + `status='live'` |
| 5 | Cure d'âme « Échec » | pas de notif équipe, table prod | code+SQL | notif équipe + log ; table via SQL |
| 6 | Prières « ne part pas » | client anon RLS | code | endpoint serveur + notif + lecture authentifiée |
| 7 | Réponse pastorale | membre ne reçoit rien | code | `notifyUser` in-app + `can_respond_pastoral` + garde dual |
| 8 | Téléchargements | pas de tracking | code | POST `/api/activity` |
| 9 | Visibilité Super Admin | agrégation notifs absente | code | `/api/admin/notifications/stats` + carte cockpit |
| 10 | Lives embarqués | replays sortaient YouTube | code | lecteur iframe intégré |
| 11 | Playlists programmes | en dur, sans vidéo | code | 4 playlists embarquées (iframe) |
| 12 | Événements (refresh) | client anon RLS | code | `getBrowserClient()` |
| 13 | Analytics 0 | table absente en prod | SQL | `apply-analytics-interne` |
| 14 | Messagerie `public.messages` | table absente en prod | SQL | `apply-communication-center` |
| 15 | Rôle/statut non répercuté | profil caché, pas de re-sync | code | re-sync profil au focus/onglet |
| 16 | Espace formateur vide | `formations.instructeur_id` jamais saisi | code+data | champ « Formateur responsable » au CMS + état honnête |
| 17 | Réunion : groupe archivé / bouton join | pas de filtre actif + join masqué si lien vide | code | filtre groupes actifs + fallback « lien à venir » |
| 18 | Groupe public connecté | page ne lit pas `useAuth` | code | CTA « Rejoindre » si connecté |

## Fichiers code modifiés / créés (additifs)
`presences-server.ts`, `permissions.ts` (+`can_respond_pastoral`), `pastoral-auth.ts` (nouveau), `notify` (réutilisé), AuthProvider (re-sync), lives/ressources/prieres/evenements/delivrance/reunions/groupes pages, admin delivrance + submissions routes, admin formations CMS, gouvernement cockpit (+`NotificationsActivityCard`), nouvelles routes : `/livret-accueil`, `/api/member/reminders`, `/api/member/prieres`, `/api/admin/notifications/stats`. Test ajouté : `permissions.test.ts` (réponse pastorale).

## SQL fourni (SQL Editor) — voir mémo
`apply-rbac-roles`, `apply-communaute-v1`, `apply-presences-v1`, `apply-communication-center`, `apply-analytics-interne` (nouveau), `apply-notifications-engine`, `apply-pastoral-schema`, `apply-stabilisation-schema`, `apply-lot-b`, `apply-lot-c` + seeds.

## Limite assumée
Pas d'accès à la prod Supabase : les **tests bout-en-bout réels** restent à exécuter après application des SQL + déploiement du ZIP (checklist par rôle dans le mémo). Validation faite ici = root-cause vérifiée + 294 tests + build production.

# 🚀 MÉMO D'EXÉCUTION PRODUCTION — Citadelle (recette P0)

> Suivre les étapes **dans l'ordre**. Build de référence : `deploy-citadelle.zip` (BUILD_ID `Gv4kuycUnHYGpEEVGVe3i`).
> Tous les SQL sont **idempotents** (réexécutables sans risque) et à la **racine du projet**.

---

## ÉTAPE 1 — Sauvegarde
Supabase → **Database → Backups** → créer une sauvegarde manuelle avant toute exécution.

## ÉTAPE 2 — SQL schéma (Supabase → SQL Editor, dans l'ordre)

| # | Fichier | Objectif | Vérification (doit renvoyer non-null / une ligne) |
|---|---|---|---|
| 1 | `apply-rbac-roles-sql-editor.sql` | Rôles fonctionnels assignables | `select unnest(enum_range(null::user_role));` contient `formateur` |
| 2 | `apply-communaute-v1-sql-editor.sql` | `groupes` + `membres_groupe.statut`, `is_primary` | `select column_name from information_schema.columns where table_name='membres_groupe' and column_name='statut';` |
| 3 | `apply-presences-v1-sql-editor.sql` | `group_reunions` + `group_attendance` | `select to_regclass('public.group_reunions');` |
| 4 | `apply-communication-center-sql-editor.sql` | **`public.messages`** (messagerie 1:1) | `select to_regclass('public.messages');` |
| 5 | `apply-analytics-interne-sql-editor.sql` | `analytics_sessions` + `analytics_events` | `select count(*) from analytics_sessions;` |
| 6 | `apply-notifications-engine-sql-editor.sql` | anti-doublon notifs + `pastoral_alerts` | `select to_regclass('public.pastoral_alerts');` |
| 7 | `apply-pastoral-schema-sql-editor.sql` | `pastoral_notes` + journal actions | `select to_regclass('public.pastoral_notes');` |
| 8 | `apply-stabilisation-schema-sql-editor.sql` | `formation_questions` (Q&A) | `select to_regclass('public.formation_questions');` |
| 9 | `apply-lot-b-schema-sql-editor.sql` | `video_progress` | `select to_regclass('public.video_progress');` |
| 10 | `apply-lot-c-schema-sql-editor.sql` | source vidéo hybride | exécuté sans erreur |

> ⚠️ `apply-rbac-roles` : si erreur *« cannot run inside a transaction block »*, exécuter ses `ALTER TYPE … ADD VALUE` **ligne par ligne**.

## ÉTAPE 3 — SQL données (seed)
Exécuter `seed-lot-a-sql-editor.sql` puis `seed-parcours-2-sql-editor.sql`.

## ÉTAPE 4 — Recharger le cache PostgREST
```sql
NOTIFY pgrst, 'reload schema';
```
(Indispensable si l'erreur *« Could not find table … in the schema cache »* persiste.)

## ÉTAPE 5 — (Optionnel) Assigner les formations existantes à un formateur
Si des formations existent déjà sans formateur (espace formateur vide) :
```sql
-- 1) Trouver l'ID du formateur (ou le copier depuis l'URL /admin/membres/<id>)
select id, prenom, nom, role from public.profiles where role = 'formateur';
-- 2) Assigner (remplacer <UUID_FORMATEUR> et le slug de la formation)
update public.formations set instructeur_id = '<UUID_FORMATEUR>' where slug = '<slug-formation>';
```
> Désormais, l'admin peut aussi assigner via **Formations (LMS) → champ « Formateur responsable (ID profil) »**.

## ÉTAPE 6 — Déploiement du code (ZIP)
1. Téléverser `deploy-citadelle.zip` sur le serveur (`/home/frprszbd/citadelle`).
2. Décompresser **en écrasant** les fichiers existants.

## ÉTAPE 7 — Redémarrage Passenger
```bash
cd /home/frprszbd/citadelle && mkdir -p tmp && touch tmp/restart.txt
```
(ou cPanel → *Setup Node.js App* → **Restart**.) Vérifier la home, puis ouvrir `/livret-accueil`.

## ÉTAPE 8 — Cron (alertes live)
cPanel → **Cron Jobs** : appeler toutes les 2–5 min :
```
curl -s https://citadelle.chapelleduroyaume.org/api/cron/notifications
```
(Ajouter le secret/clé si la route en exige un.)

## ÉTAPE 9 — Configuration admin
- `/admin/parametres` → **Livret d'Accueil** : coller l'URL du PDF (après upload dans **Médias**).
- Au lancement d'un direct : passer le live à `cms_lives.status = 'live'` (pour déclencher l'alerte sonore).

## ÉTAPE 10 — Recette manuelle par rôle (cf. §ci-dessous)

---

## 📊 Matrice de dépendances

| Fonction | Code (ZIP) | SQL | Cron |
|---|:--:|:--:|:--:|
| Analytics | déjà en prod | ✅ #5 | ❌ |
| Réunions (visibilité + join) | ✅ | ✅ #2 #3 | ❌ |
| Groupes (carte publique) | ✅ | ✅ #2 | ❌ |
| Messagerie admin→membre | déjà en prod | ✅ #4 | ❌ |
| Rôle / statut membre | ✅ | ✅ #1 | ❌ (+ retour onglet) |
| Notifications | déjà en prod | ✅ #6 | ⚠️ générées |
| Cure d'âme | ✅ | table déjà là | ❌ |
| Prières | ✅ | table déjà là | ❌ |
| Livret | ✅ | ❌ | ❌ (+ config URL) |
| Téléchargements | ✅ | déjà là | ❌ |
| Alertes live | déjà en prod | ✅ #6 | ✅ |
| Événements | ✅ | déjà là | ❌ |
| Espace formateur | ✅ | #1 (+ assignation) | ❌ |

## 🟢 Après les SQL — ce qui se débloque
- **Immédiat (SQL seul, sans ZIP)** : Analytics, Messagerie (`messages`), Réunions visibles. *(le code concerné est déjà en prod)*
- **Avec le ZIP** : Lives (partager/rappeler/replays/playlists), Livret, Téléchargements, Prières & Événements (persistance), réponse pastorale in-app, groupes publics (Rejoindre), rôle/statut (re-sync), espace formateur, cockpit notifications.
- **Avec le cron** : alertes sonores live.
- **Nouveau test utilisateur requis** : rôle/statut (retour sur l'onglet ou reconnexion), réunion bout-en-bout, messagerie.

---

## ✅ Checklist de recette manuelle par rôle

**membre** — inscription événement → refresh (persiste) · prière → apparaît dans « Mes demandes » · cure d'âme (pas d'« Échec ») · téléchargement (compteur) · live : Partager / Me rappeler / replay intégré / playlists · cloche réceptionne.
**leader** — voit ses groupes · crée une réunion · les membres reçoivent la notif (cloche → /reunions) · enregistre les présences.
**formateur** — voit *Espace Formateur* · si une formation lui est assignée (instructeur_id) : la voit + ses inscrits ; sinon message honnête.
**responsable intégration** — liste des nouveaux membres / suivi.
**responsable national** — tableau national · **répondre à une demande pastorale** → le membre reçoit la réponse (cloche).
**admin** — message → membre (reçu + cloche) · traite prières/cure d'âme · dashboards à jour.
**super_admin** — cockpit gouvernement : *Activité Notifications*, présences, conversions · analytics temps réel remonte.

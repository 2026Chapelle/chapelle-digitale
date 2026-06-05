# Livraison — Chantier 4 (Réunions · Présences · Assiduité) V1

> Statut : **GO avec réserves mineures** (3 agents QA : Sécurité, Backend, Fonctionnel). Aucune réserve critique.

## Périmètre livré
Création de réunion · calendrier · réunion physique/virtuelle/hybride · présences/absences/excusés · tableau leader · tableau responsable · statistiques de présence · alertes d'absence.

## Base de données (`apply-presences-v1-sql-editor.sql`)
- `group_reunions` : id, groupe_id→groupes, titre, description, type (physique/virtuelle/hybride), date_reunion, duree_min, lieu, lien_visio, statut (planifiee/tenue/annulee), created_by, timestamps. Trigger `updated_at`.
- `group_attendance` : id, reunion_id→group_reunions, user_id→profiles, statut (present/absent/excuse), note, recorded_by, recorded_at, unique(reunion_id,user_id).
- RLS : `reunions_member_read` (membre actif du groupe), `attendance_self_read` (ses présences) ; écriture = service role.

## Architecture (réutilise l'existant, zéro doublon)
```
LIB  ── attendance.ts (PUR, testé : validateReunionInput, computeAttendanceStats, absenceStreak, shouldAlertAbsence)
        presences-server.ts (SERVICE unique : CRUD réunions, recordAttendance, stats, détection absence)
API  ── /api/member/reunions (leader/scope/membre) · /api/admin/reunions (global)
UI   ── /member/dashboard/reunions · /admin/reunions + entrées sidebar
```
- Autorisation via `canManageGroup` = `canScopeManageGroup` (RBAC) **OU** `isGroupLeader` (réutilise group-scope/groups-access/groups-server).
- Alertes d'absence via `raisePastoralAlert` (moteur existant) ; notif de création via `notifyUser`.

## Règles métier
- `recordAttendance` : restreint aux **membres actifs** du groupe (anti-pollution stats + fausses alertes), préserve les notes existantes, marque « tenue » seulement si ≥1 présence enregistrée.
- Détection d'absence : série d'absences non excusées consécutives ≥ 3 → alerte pastorale (dédupliquée par le moteur).
- Stats : global + par réunion + par membre (trié du moins au plus assidu).

## Sécurité (GO)
Gestion réservée à `canManageGroup` (leader/scope/admin) ; lecture réunions = membre actif ; stats/feuille = gestion ; IDOR fermé (recharge serveur via `reunion.groupe_id`) ; RLS lecture + écriture service role ; admin gardé `isAdminRequest` GET+POST.

## Réserves résiduelles (mineures)
- Codes HTTP POST 400 générique (vs 500) sur panne serveur (aligné au reste du code).
- Icône/lieu d'une réunion `hybride` côté UI (cosmétique : icône lieu au lieu de visio dans le calendrier admin).
- Sémantique du streak avec réunions non relevées (conservatrice : ne compte que les absences connues).

## Déploiement
Nécessite l'exécution de `apply-presences-v1-sql-editor.sql` dans Supabase SQL Editor **avant** usage, puis redéploiement du ZIP.
